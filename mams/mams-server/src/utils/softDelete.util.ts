import { Types } from 'mongoose';

export function softDeleteFields(deletedByUserId: string) {
  return {
    deletedAt: new Date(),
    deletedBy: new Types.ObjectId(deletedByUserId),
  };
}

export function clearSoftDeleteFields() {
  return {
    deletedAt: null,
    deletedBy: null,
  };
}
