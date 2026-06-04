import { Router } from 'express';
import { z } from 'zod';
import express from 'express';
import { EMP_CODE_REGEX, SensitiveFieldsSchema, WeekdaySchema } from '@mams/types';
import { EmployeeModel } from '../models/Employee.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';
import { syncEmployeeCodeSequenceFromDb } from '../services/employeeCode.service.js';

const router = Router();
router.use(requireAuth);

// CSV template - what HR's source file should look like.
const TEMPLATE_HEADER = [
  'empCode', 'name', 'gender', 'department', 'designation', 'location',
  'timeShift', 'alternateShift', 'weeklyOff', 'joinDate', 'biometricId',
  'pan', 'aadhaar', 'bankAccountNumber', 'ifsc', 'accountHolderName',
  'accountType', 'bankName', 'pfNumber', 'esiNumber', 'status',
];

router.get('/template', requirePermission('manage.users'), (_req, res) => {
  const sample = [
    'MKS0001', 'Aarav Patel', 'M', 'Confectionery', 'Operator', 'Surendranagar, GJ',
    'Day', 'A', 'Sunday', '2020-04-15', 'BIO001',
    'ABCPD1234E', '123456789012', '12345678901234', 'HDFC0001234', 'Aarav Patel',
    'Savings', 'HDFC Bank', 'GJ/SUR/12345/100', '1234567890', 'Active',
  ];
  const csv = [TEMPLATE_HEADER.join(','), sample.join(',')].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mams-employee-import-template.csv"');
  res.send(`\uFEFF${csv}`);
});

const textBody = express.text({ type: '*/*', limit: '10mb' });

const RowSchema = z.object({
  empCode: z.string().regex(EMP_CODE_REGEX),
  name: z.string().min(1),
  gender: z.enum(['M', 'F', 'O']),
  department: z.string().min(1),
  designation: z.string().min(1),
  location: z.string().min(1),
  timeShift: z.enum(['Day', 'Night']),
  alternateShift: z.enum(['A', 'B', 'C']),
  weeklyOff: z
    .string()
    .min(1)
    .transform((s) => s.split(';').map((t) => t.trim()).filter(Boolean))
    .pipe(z.array(WeekdaySchema).min(1).max(2)),
  joinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  biometricId: z.string().min(1),
  pan: SensitiveFieldsSchema.shape.pan,
  aadhaar: SensitiveFieldsSchema.shape.aadhaar,
  bankAccountNumber: SensitiveFieldsSchema.shape.bankAccountNumber,
  ifsc: SensitiveFieldsSchema.shape.ifsc,
  accountHolderName: SensitiveFieldsSchema.shape.accountHolderName,
  accountType: SensitiveFieldsSchema.shape.accountType,
  bankName: SensitiveFieldsSchema.shape.bankName,
  pfNumber: SensitiveFieldsSchema.shape.pfNumber,
  esiNumber: SensitiveFieldsSchema.shape.esiNumber,
  status: z.enum(['Active', 'Inactive']),
});

router.post('/', requirePermission('manage.users'), textBody, async (req, res, next) => {
  try {
    const body = String(req.body ?? '');
    const lines = body.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ error: 'empty_or_no_data', message: 'CSV must contain header + at least one row' });
    }

    const header = lines[0]!.split(',').map((s) => s.trim());
    const missing = TEMPLATE_HEADER.filter((h) => !header.includes(h));
    if (missing.length > 0) {
      return res.status(400).json({ error: 'missing_columns', message: `Missing columns: ${missing.join(', ')}` });
    }

    const result = {
      totalRows: lines.length - 1,
      successCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      errors: [] as Array<{ rowIndex: number; empCode: string; reason: string }>,
    };

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]!);
      const obj: Record<string, string> = {};
      header.forEach((h, idx) => (obj[h] = (cells[idx] ?? '').trim()));

      const parsed = RowSchema.safeParse(obj);
      if (!parsed.success) {
        result.invalidCount += 1;
        result.errors.push({ rowIndex: i + 1, empCode: obj.empCode ?? '', reason: parsed.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`).join('; ') });
        continue;
      }

      const dupEmp = await EmployeeModel.findOne({ empCode: parsed.data.empCode });
      if (dupEmp) {
        result.duplicateCount += 1;
        result.errors.push({
          rowIndex: i + 1,
          empCode: parsed.data.empCode,
          reason: 'duplicate employee code (already exists in database)',
        });
        continue;
      }
      const dupBio = await EmployeeModel.findOne({ biometricId: parsed.data.biometricId });
      if (dupBio) {
        result.duplicateCount += 1;
        result.errors.push({
          rowIndex: i + 1,
          empCode: parsed.data.empCode,
          reason: 'duplicate biometric ID (already exists in database)',
        });
        continue;
      }

      await EmployeeModel.create({
        ...parsed.data,
        joinDate: new Date(parsed.data.joinDate),
      });
      result.successCount += 1;
    }

    await audit(
      'csv_import',
      { userId: req.auth!.sub, ipAddress: req.clientIp ?? null, userAgent: req.header('user-agent') ?? null },
      { entityType: 'employee', payload: { totalRows: result.totalRows, successCount: result.successCount, duplicateCount: result.duplicateCount, invalidCount: result.invalidCount } }
    );

    if (result.successCount > 0) {
      await syncEmployeeCodeSequenceFromDb();
    }

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ',') {
        out.push(cur);
        cur = '';
      } else if (c === '"' && cur.length === 0) {
        inQuotes = true;
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

export default router;
