import { Router } from 'express';
import { Types } from 'mongoose';
import {
  EmployeeListQuerySchema,
  EmployeeCreateBodySchema,
  EmployeePatchBodySchema,
} from '@mams/types';
import { EmployeeModel } from '../models/Employee.js';
import { toMaskedEmployee } from '../services/employee.service.js';
import { allocateNextEmpCode, previewNextEmpCode } from '../services/employeeCode.service.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { audit, logUnmask } from '../services/audit.service.js';
import { mapEmployeeCreateDuplicateError } from '../utils/mongoDuplicate.js';

const router = Router();

router.use(requireAuth);

// Preview next server-allocated emp code (must be before /:id)
router.get('/next-code', requirePermission('manage.users'), async (_req, res, next) => {
  try {
    const nextEmpCode = await previewNextEmpCode();
    res.json({ nextEmpCode });
  } catch (err) {
    next(err);
  }
});

// LIST - masked
router.get('/', async (req, res, next) => {
  try {
    const q = EmployeeListQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (q.search) {
      const re = new RegExp(escapeRegex(q.search), 'i');
      filter.$or = [{ name: re }, { empCode: re }, { biometricId: re }];
    }
    if (q.department) filter.department = q.department;
    if (q.location) filter.location = q.location;
    if (q.status) filter.status = q.status;

    const total = await EmployeeModel.countDocuments(filter);
    const items = await EmployeeModel.find(filter)
      .sort({ empCode: 1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize);

    res.json({
      items: items.map((d) => toMaskedEmployee(d.toObject() as any)),
      total,
      page: q.page,
      pageSize: q.pageSize,
    });
  } catch (err) {
    next(err);
  }
});

// GET ONE - masked
router.get('/:id', async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id ?? '')) {
      throw new ApiError(404, 'not_found', 'Employee not found');
    }
    const doc = await EmployeeModel.findById(req.params.id);
    if (!doc || doc.isDeleted) throw new ApiError(404, 'not_found', 'Employee not found');
    res.json(toMaskedEmployee(doc.toObject() as any));
  } catch (err) {
    next(err);
  }
});

// UNMASK a sensitive field - role-gated, audit-logged
router.post('/:id/unmask', requirePermission('unmask.sensitive'), async (req, res, next) => {
  try {
    const FieldSchema = (await import('zod')).z.object({
      field: (await import('zod')).z.enum(['pan', 'aadhaar', 'bankAccountNumber', 'pfNumber', 'esiNumber']),
      reason: (await import('zod')).z.string().optional(),
    });
    const { field, reason } = FieldSchema.parse(req.body);
    if (!Types.ObjectId.isValid(req.params.id ?? '')) {
      throw new ApiError(404, 'not_found', 'Employee not found');
    }
    const doc = await EmployeeModel.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'not_found', 'Employee not found');

    await logUnmask(req.auth!.sub, doc._id, field, {
      ipAddress: req.clientIp ?? null,
      userAgent: req.header('user-agent') ?? null,
      reason: reason ?? null,
    });

    res.json({ field, value: (doc as any)[field], unmaskedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// CREATE
router.post('/', requirePermission('manage.users'), async (req, res, next) => {
  try {
    const body = EmployeeCreateBodySchema.parse(req.body);
    const empCode = await allocateNextEmpCode();
    let created;
    try {
      created = await EmployeeModel.create({
        ...body,
        empCode,
        joinDate: new Date(body.joinDate),
      });
    } catch (createErr: unknown) {
      const mapped = mapEmployeeCreateDuplicateError(createErr);
      if (mapped) throw mapped;
      throw createErr;
    }
    await audit(
      'employee_created',
      {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      { entityType: 'employee', entityId: created._id, payload: { empCode: created.empCode } }
    );
    res.status(201).json(toMaskedEmployee(created.toObject() as any));
  } catch (err) {
    next(err);
  }
});

// UPDATE
router.patch('/:id', requirePermission('manage.users'), async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id ?? '')) {
      throw new ApiError(404, 'not_found', 'Employee not found');
    }
    const partial = EmployeePatchBodySchema.parse(req.body);
    const doc = await EmployeeModel.findByIdAndUpdate(
      req.params.id,
      { $set: partial },
      { new: true }
    );
    if (!doc) throw new ApiError(404, 'not_found', 'Employee not found');
    await audit(
      'employee_updated',
      {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      { entityType: 'employee', entityId: doc._id, payload: { changedFields: Object.keys(partial) } }
    );
    res.json(toMaskedEmployee(doc.toObject() as any));
  } catch (err) {
    next(err);
  }
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default router;
