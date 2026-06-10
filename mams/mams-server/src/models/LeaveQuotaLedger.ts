import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const leaveQuotaLedgerSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    periodKey: { type: String, required: true },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    relatedApplicationId: { type: Schema.Types.ObjectId, ref: 'LeaveApplication', default: null },
    occurredAt: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

leaveQuotaLedgerSchema.index({ employeeId: 1, occurredAt: -1 });

export type LeaveQuotaLedgerDoc = InferSchemaType<typeof leaveQuotaLedgerSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const LeaveQuotaLedgerModel = mongoose.model('LeaveQuotaLedger', leaveQuotaLedgerSchema);
