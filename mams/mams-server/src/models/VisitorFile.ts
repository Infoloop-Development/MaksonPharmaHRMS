import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const visitorFileSchema = new Schema(
  {
    storageKey: { type: String, required: true, unique: true, index: true },
    formId: { type: Schema.Types.ObjectId, ref: 'VisitorForm', required: true },
    fieldId: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedAt: { type: Date, default: () => new Date() },
    submitterIp: { type: String, default: null },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type VisitorFileDoc = InferSchemaType<typeof visitorFileSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const VisitorFileModel = mongoose.model('VisitorFile', visitorFileSchema);
