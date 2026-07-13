import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { SensitiveUnmaskFieldSchema } from '@mams/types';
import { UserModel } from '../models/User.js';
import { userHasUnmaskGrant } from '../services/unmaskGrants.service.js';
import {
  EmployeeListQuerySchema,
  EmployeeCreateBodySchema,
  EmployeePatchBodySchema,
  BulkIdsBodySchema,
} from '@mams/types';
import { EmployeeModel } from '../models/Employee.js';
import { toMaskedEmployee } from '../services/employee.service.js';
import { allocateNextEmpCode, previewNextEmpCode } from '../services/employeeCode.service.js';
import { requireAuth, requirePermission, requireAnyPermission } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { isUnmaskEnabled } from '../config/featureFlags.js';
import { audit, logUnmask, logUnmaskActivity } from '../services/audit.service.js';
import { parseSortQuery } from '../utils/sortQuery.js';
import { mapEmployeeCreateDuplicateError } from '../utils/mongoDuplicate.js';
import { softDeleteFields } from '../utils/softDelete.util.js';

const router = Router();

router.use(requireAuth);

const manageEmployeesGate = requireAnyPermission('manage.employees', 'manage.users');
const hrReadGate = requireAnyPermission('read.real', 'read.compliant', 'manage.employees');

// Preview next server-allocated emp code (must be before /:id)
router.get('/next-code', requireAnyPermission('manage.employees', 'manage.users'), async (_req, res, next) => {
  try {
    const nextEmpCode = await previewNextEmpCode();
    res.json({ nextEmpCode });
  } catch (err) {
    next(err);
  }
});

// LIST - masked
router.get('/', hrReadGate, async (req, res, next) => {
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
    const sort = parseSortQuery(q.sortBy, q.sortDir, {
      name: 'name',
      empCode: 'empCode',
      department: 'department',
      status: 'status',
      joinDate: 'joinDate',
    }, { empCode: 1 });
    const items = await EmployeeModel.find(filter)
      .sort(sort)
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize);

    res.json({
      items: items.map((d) => toMaskedEmployee(d.toObject() as any, req.auth!.viewMode)),
      total,
      page: q.page,
      pageSize: q.pageSize,
    });
  } catch (err) {
    next(err);
  }
});

// Plain profile view - always masked. Sensitive fields are only ever revealed via the
// per-field, password-gated, audit-logged /:id/unmask endpoint below. The employee edit
// form never needs real values either - sensitive inputs start blank and only overwrite
// a field when the admin types a new one (see EmployeesAddModal.tsx).
router.get('/:id', hrReadGate, async (req, res, next) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id ?? '')) {
      throw new ApiError(404, 'not_found', 'Employee not found');
    }
    const doc = await EmployeeModel.findById(req.params.id);
    if (!doc || doc.isDeleted) throw new ApiError(404, 'not_found', 'Employee not found');
    res.json(toMaskedEmployee(doc.toObject() as any, req.auth!.viewMode));
  } catch (err) {
    next(err);
  }
});

// UNMASK a sensitive field - role-gated, audit-logged
router.post('/:id/unmask', requirePermission('unmask.sensitive'), async (req, res, next) => {
  try {
    if (!isUnmaskEnabled()) {
      throw new ApiError(404, 'feature_disabled', 'Not found');
    }
    const FieldSchema = (await import('zod')).z.object({
      field: SensitiveUnmaskFieldSchema,
      password: (await import('zod')).z.string().min(1),
      reason: (await import('zod')).z.string().optional(),
    });
    const { field, password, reason } = FieldSchema.parse(req.body);
    if (!Types.ObjectId.isValid(req.params.id ?? '')) {
      throw new ApiError(404, 'not_found', 'Employee not found');
    }

    const doc = await EmployeeModel.findById(req.params.id);
    if (!doc || doc.isDeleted) throw new ApiError(404, 'not_found', 'Employee not found');

    const actor = await UserModel.findById(req.auth!.sub);
    if (!actor || !actor.isActive) {
      throw new ApiError(401, 'unauthorized', 'User not found or inactive');
    }

    const auditCtx = {
      ipAddress: req.clientIp ?? null,
      userAgent: req.header('user-agent') ?? null,
      reason: reason ?? null,
      empCode: doc.empCode ?? null,
      empName: doc.name ?? null,
    };

    const passwordOk = await bcrypt.compare(password, actor.passwordHash);
    if (!passwordOk) {
      await logUnmaskActivity('failed', req.auth!.sub, doc._id, field, {
        ...auditCtx,
        failureReason: 'password_failed',
      });
      throw new ApiError(401, 'invalid_credentials', 'Incorrect password');
    }

    if (!userHasUnmaskGrant(actor, field)) {
      await logUnmaskActivity('failed', req.auth!.sub, doc._id, field, {
        ...auditCtx,
        failureReason: 'forbidden',
      });
      throw new ApiError(403, 'forbidden', 'You are not allowed to unmask this field');
    }

    const rawValue = (doc as unknown as Record<string, unknown>)[field];
    const value = rawValue == null ? '' : String(rawValue);

    await logUnmask(req.auth!.sub, doc._id, field, auditCtx);
    await logUnmaskActivity('succeeded', req.auth!.sub, doc._id, field, auditCtx);

    res.json({ field, value, unmaskedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// CREATE
router.post('/', manageEmployeesGate, async (req, res, next) => {
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
    res.status(201).json(toMaskedEmployee(created.toObject() as any, req.auth!.viewMode));
  } catch (err) {
    next(err);
  }
});

// UPDATE
router.patch('/:id', manageEmployeesGate, async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'not_found', 'Employee not found');
    }
    const existing = await EmployeeModel.findById(id);
    if (!existing || existing.isDeleted) throw new ApiError(404, 'not_found', 'Employee not found');

    const partial = EmployeePatchBodySchema.parse(req.body);
    const update: Record<string, unknown> = { ...partial };
    if (partial.joinDate) {
      update.joinDate = new Date(partial.joinDate);
    }

    let doc;
    try {
      doc = await EmployeeModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    } catch (updateErr: unknown) {
      const mapped = mapEmployeeCreateDuplicateError(updateErr);
      if (mapped) throw mapped;
      throw updateErr;
    }
    if (!doc || doc.isDeleted) throw new ApiError(404, 'not_found', 'Employee not found');
    await audit(
      'employee_updated',
      {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      {
        entityType: 'employee',
        entityId: doc._id,
        payload: {
          empCode: doc.empCode,
          name: doc.name,
          changedFields: Object.keys(partial),
        },
      }
    );
    res.json(toMaskedEmployee(doc.toObject() as any, req.auth!.viewMode));
  } catch (err) {
    next(err);
  }
});

// Bulk soft delete (must be before /:id)
router.post('/bulk-delete', manageEmployeesGate, async (req, res, next) => {
  try {
    const body = BulkIdsBodySchema.parse(req.body);
    const result = { succeeded: 0, skipped: 0, errors: [] as Array<{ id: string; reason: string }> };

    for (const id of body.ids) {
      if (!Types.ObjectId.isValid(id)) {
        result.skipped += 1;
        result.errors.push({ id, reason: 'Invalid id' });
        continue;
      }
      const doc = await EmployeeModel.findById(id);
      if (!doc || doc.isDeleted) {
        result.skipped += 1;
        result.errors.push({ id, reason: 'Employee not found' });
        continue;
      }

      doc.isDeleted = true;
      doc.status = 'Inactive';
      Object.assign(doc, softDeleteFields(req.auth!.sub));
      await doc.save();

      await audit(
        'employee_deleted',
        {
          userId: req.auth!.sub,
          ipAddress: req.clientIp ?? null,
          userAgent: req.header('user-agent') ?? null,
        },
        {
          entityType: 'employee',
          entityId: doc._id,
          payload: { empCode: doc.empCode, name: doc.name, bulk: true },
        }
      );
      result.succeeded += 1;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE (soft)
router.delete('/:id', manageEmployeesGate, async (req, res, next) => {
  try {
    const id = req.params.id ?? '';
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'not_found', 'Employee not found');
    }
    const doc = await EmployeeModel.findById(id);
    if (!doc || doc.isDeleted) throw new ApiError(404, 'not_found', 'Employee not found');

    doc.isDeleted = true;
    doc.status = 'Inactive';
    Object.assign(doc, softDeleteFields(req.auth!.sub));
    await doc.save();

    await audit(
      'employee_deleted',
      {
        userId: req.auth!.sub,
        ipAddress: req.clientIp ?? null,
        userAgent: req.header('user-agent') ?? null,
      },
      {
        entityType: 'employee',
        entityId: doc._id,
        payload: { empCode: doc.empCode, name: doc.name },
      }
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default router;
