import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * APPEND-ONLY collection. Original biometric punches.
 *
 * Mutability is enforced at THREE layers (per SAD §4.2):
 *   1. The MongoDB application user has only insert + find privileges (DBA configures).
 *   2. Mongoose pre-hooks below throw on any update / delete.
 *   3. There is no PATCH or DELETE route exposing this collection.
 */
const attendanceRawSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    biometricId: { type: String, required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', default: null, index: true },
    punchType: { type: String, enum: ['IN', 'OUT', 'OTHER'], required: true },
    rawTimestamp: { type: Date, required: true, index: true },
    rawDate: { type: String, required: true }, // YYYY-MM-DD in IST
    rawPayload: { type: Schema.Types.Mixed, default: {} },
    receivedAt: { type: Date, required: true },
    sourceIp: { type: String, default: null },
    vendor: { type: String, enum: ['eSSL', 'Hanvon'], default: 'eSSL' },
    parserVersion: { type: String, default: null },
    rawProtocol: { type: String, default: null },
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

attendanceRawSchema.index({ employeeId: 1, rawDate: 1 });
attendanceRawSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

// Pre-hook guards: refuse all mutation paths.
const refuseMutation = function (next: (err?: Error) => void) {
  next(new Error('attendance_raw is APPEND-ONLY: updates and deletes are forbidden'));
};
attendanceRawSchema.pre('updateOne', refuseMutation);
attendanceRawSchema.pre('updateMany', refuseMutation);
attendanceRawSchema.pre('findOneAndUpdate', refuseMutation);
attendanceRawSchema.pre('deleteOne', refuseMutation);
attendanceRawSchema.pre('deleteMany', refuseMutation);
attendanceRawSchema.pre('findOneAndDelete', refuseMutation);

export type AttendanceRawDoc = InferSchemaType<typeof attendanceRawSchema> & { _id: mongoose.Types.ObjectId };
export const AttendanceRawModel = mongoose.model('AttendanceRaw', attendanceRawSchema);
