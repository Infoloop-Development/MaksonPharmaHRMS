import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * APPEND-ONLY. Every sensitive action lands here.
 * Indexed for both per-user audits and per-entity history queries.
 */
const auditLogSchema = new Schema(
  {
    occurredAt: { type: Date, default: () => new Date(), index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    eventType: { type: String, required: true, index: true },
    entityType: { type: String, default: null },
    entityId: { type: Schema.Types.ObjectId, default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ userId: 1, occurredAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, occurredAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof auditLogSchema> & { _id: mongoose.Types.ObjectId };
export const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);
