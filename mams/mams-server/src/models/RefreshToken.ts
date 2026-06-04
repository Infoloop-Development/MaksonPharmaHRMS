import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    rotatedFromTokenHash: { type: String, default: null },
    issuedFromIp: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB TTL index: documents auto-delete after expiresAt.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema> & { _id: mongoose.Types.ObjectId };
export const RefreshTokenModel = mongoose.model('RefreshToken', refreshTokenSchema);
