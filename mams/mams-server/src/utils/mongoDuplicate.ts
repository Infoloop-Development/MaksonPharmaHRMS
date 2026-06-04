import { ApiError } from '../middleware/error.js';

type MongoLikeErr = {
  code?: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
};

/**
 * Map Mongo duplicate key (E11000) from `EmployeeModel.create` to a client-facing ApiError.
 * Returns null if the error is not a handled duplicate-key case.
 */
export function mapEmployeeCreateDuplicateError(err: unknown): ApiError | null {
  const ce = err as MongoLikeErr;
  if (ce.code !== 11000) return null;

  const kv = ce.keyValue;
  const hasEmp = ce.keyPattern && 'empCode' in ce.keyPattern;
  const hasBio = ce.keyPattern && 'biometricId' in ce.keyPattern;
  const kvEmp = kv && 'empCode' in kv;
  const kvBio = kv && 'biometricId' in kv;

  if (hasEmp || kvEmp) {
    return new ApiError(
      409,
      'duplicate_emp_code',
      'Employee code already exists. Refresh the form and try again, or contact support if this persists.'
    );
  }
  if (hasBio || kvBio) {
    return new ApiError(409, 'duplicate_biometric_id', 'Biometric ID already exists. Use a unique ID.');
  }
  return new ApiError(
    409,
    'duplicate_key',
    'This record conflicts with existing data (duplicate unique field).'
  );
}
