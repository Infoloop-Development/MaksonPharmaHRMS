import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const leaveTypeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    paid: { type: Boolean, default: true },
    halfDayEligible: { type: Boolean, default: true },
    maxConsecutiveDays: { type: Number, default: null },
    requiresDocument: { type: Boolean, default: false },
    annualQuotaDefault: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type LeaveTypeDoc = InferSchemaType<typeof leaveTypeSchema> & { _id: mongoose.Types.ObjectId };
export const LeaveTypeModel = mongoose.model('LeaveType', leaveTypeSchema);
