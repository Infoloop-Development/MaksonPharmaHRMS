import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * APPEND-ONLY. Workflow:
 *   Pending -> Approved   (decidedBy/At/Note populated)
 *   Pending -> Rejected   (decidedBy/At/Note populated)
 * Once Approved, the linked attendance_derived record is recomputed.
 * No auto-approval. No deemed approval. No time-elapsed approval.
 */
const adjustmentSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: String, required: true },
    fieldChanged: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    reason: { type: String, required: true },
    justification: { type: String, required: true, minlength: 10 },
    evidenceRef: { type: String, required: true },
    salaryImpactNote: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    initiatedAt: { type: Date, default: () => new Date() },
    initiatedFromIp: { type: String, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    decidedFromIp: { type: String, default: null },
    approverNote: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adjustmentSchema.index({ status: 1, employeeId: 1 });
adjustmentSchema.index({ employeeId: 1, date: 1 });

export type AdjustmentDoc = InferSchemaType<typeof adjustmentSchema> & { _id: mongoose.Types.ObjectId };
export const AdjustmentModel = mongoose.model('Adjustment', adjustmentSchema);
