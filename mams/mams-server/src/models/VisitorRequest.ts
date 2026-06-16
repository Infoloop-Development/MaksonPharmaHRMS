import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const fileAttachmentSchema = new Schema(
  {
    fieldId: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageKey: { type: String, required: true },
  },
  { _id: false }
);

const visitorRequestSchema = new Schema(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'VisitorForm', required: true, index: true },
    formVersion: { type: Number, required: true },
    publicSlug: { type: String, required: true },
    formTitle: { type: String, required: true },
    fieldsSnapshot: { type: Schema.Types.Mixed, required: true },
    responses: { type: Schema.Types.Mixed, default: {} },
    fileAttachments: { type: [fileAttachmentSchema], default: [] },
    introAttestation: {
      type: {
        videoCompleted: { type: Boolean, required: true },
        completedAt: { type: Date, required: true },
      },
      default: null,
      _id: false,
    },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    submittedAt: { type: Date, default: () => new Date() },
    submitterIp: { type: String, default: null },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    approverNote: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

visitorRequestSchema.index({ status: 1, submittedAt: -1 });
visitorRequestSchema.index({ formId: 1, submittedAt: -1 });

export type VisitorRequestDoc = InferSchemaType<typeof visitorRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const VisitorRequestModel = mongoose.model('VisitorRequest', visitorRequestSchema);
