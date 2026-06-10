import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const leaveQuotaSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    periodKey: { type: String, required: true },
    periodType: {
      type: String,
      enum: ['calendar_year', 'financial_year', 'joining_anniversary'],
      required: true,
    },
    entitled: { type: Number, default: 0 },
    consumed: { type: Number, default: 0 },
    manualAdjustment: { type: Number, default: 0 },
  },
  { timestamps: true }
);

leaveQuotaSchema.index({ employeeId: 1, leaveTypeId: 1, periodKey: 1 }, { unique: true });

export type LeaveQuotaDoc = InferSchemaType<typeof leaveQuotaSchema> & { _id: mongoose.Types.ObjectId };
export const LeaveQuotaModel = mongoose.model('LeaveQuota', leaveQuotaSchema);
