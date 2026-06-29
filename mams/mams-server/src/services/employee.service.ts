import type { EmployeeDoc } from '../models/Employee.js';
import { maskAadhaar, maskTail } from '../utils/mask.js';
import type { EmployeeMasked, EmployeeUnmasked } from '@mams/types';

/**
 * Convert a raw Mongoose Employee doc to the masked API response shape.
 * Sensitive fields are show-last-4 with X padding (Aadhaar formatted XXXX XXXX 1234).
 */
export function toMaskedEmployee(doc: EmployeeDoc, viewMode: 'real' | 'compliant' = 'real'): EmployeeMasked {
  return {
    id: String(doc._id),
    empCode: doc.empCode,
    name: doc.name,
    gender: doc.gender as 'M' | 'F' | 'O',
    department: doc.department,
    designation: doc.designation,
    location: doc.location,
    timeShift: viewMode === 'compliant' ? undefined : (doc.timeShift as 'Day' | 'Night'),
    alternateShift: doc.alternateShift as 'A' | 'B' | 'C',
    weeklyOff: (doc.weeklyOff ?? []) as EmployeeMasked['weeklyOff'],
    joinDate: doc.joinDate.toISOString(),
    biometricId: doc.biometricId,
    pan: maskTail(doc.pan, 4),
    aadhaar: maskAadhaar(doc.aadhaar),
    bankAccountNumber: maskTail(doc.bankAccountNumber, 4),
    ifsc: maskTail(doc.ifsc, 4),
    accountHolderName: maskTail(doc.accountHolderName, 4),
    accountType: doc.accountType as EmployeeMasked['accountType'],
    bankName: maskTail(doc.bankName, 4),
    pfNumber: maskTail(doc.pfNumber, 4),
    esiNumber: maskTail(doc.esiNumber, 4),
    status: doc.status as 'Active' | 'Inactive',
    isMasked: true,
    createdAt: (doc as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: (doc as any).updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export function toUnmaskedEmployee(doc: EmployeeDoc, viewMode: 'real' | 'compliant' = 'real'): EmployeeUnmasked {
  return {
    ...toMaskedEmployee(doc, viewMode),
    pan: doc.pan,
    aadhaar: doc.aadhaar,
    bankAccountNumber: doc.bankAccountNumber,
    pfNumber: doc.pfNumber,
    esiNumber: doc.esiNumber,
    isMasked: false,
  };
}
