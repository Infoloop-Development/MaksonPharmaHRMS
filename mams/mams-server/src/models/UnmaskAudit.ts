import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * APPEND-ONLY. Every time an authorised user unmasks a sensitive field
 * (Aadhaar, PAN, bank, PF, ESI), an entry lands here.
 *
 * This is the audit trail Komal wants for point #10 - "audit-log entry
 * recording the user, timestamp, IP address, and field accessed".
 */
const unmaskAuditSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    fieldName: {
      type: String,
      enum: ['pan', 'aadhaar', 'bankAccountNumber', 'pfNumber', 'esiNumber'],
      required: true,
      index: true,
    },
    occurredAt: { type: Date, default: () => new Date() },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    reason: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

unmaskAuditSchema.index({ userId: 1, occurredAt: -1 });
unmaskAuditSchema.index({ employeeId: 1, occurredAt: -1 });
unmaskAuditSchema.index({ fieldName: 1, occurredAt: -1 });

export type UnmaskAuditDoc = InferSchemaType<typeof unmaskAuditSchema> & { _id: mongoose.Types.ObjectId };
export const UnmaskAuditModel = mongoose.model('UnmaskAudit', unmaskAuditSchema);
