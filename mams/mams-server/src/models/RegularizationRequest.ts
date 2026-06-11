import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * HR-initiated missed-punch correction workflow.
 * Pending -> Approved (raw punches inserted + derived recomputed)
 * Pending -> Rejected (no attendance mutation)
 */
const regularizationRequestSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: String, required: true },
    type: {
      type: String,
      enum: ['missed_in', 'missed_out', 'missed_both', 'wrong_punch', 'other'],
      required: true,
    },
    requestedInTime: { type: String, default: null },
    requestedOutTime: { type: String, default: null },
    reason: { type: String, required: true },
    remarks: { type: String, default: null },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    initiatedAt: { type: Date, default: () => new Date() },
    initiatedFromIp: { type: String, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    decidedFromIp: { type: String, default: null },
    approverNote: { type: String, default: null },
    appliedRawIds: { type: [Schema.Types.ObjectId], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

regularizationRequestSchema.index({ status: 1, date: -1 });
regularizationRequestSchema.index({ employeeId: 1, date: 1 });

export type RegularizationRequestDoc = InferSchemaType<typeof regularizationRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const RegularizationRequestModel = mongoose.model('RegularizationRequest', regularizationRequestSchema);
