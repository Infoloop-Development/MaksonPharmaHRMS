import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const commentAttachmentSchema = new Schema(
  {
    filePath: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: true }
);

const bugReportCommentSchema = new Schema(
  {
    bugReportId: { type: Schema.Types.ObjectId, ref: 'BugReport', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    mentionUserIds: { type: [Schema.Types.ObjectId], default: [] },
    parentId: { type: Schema.Types.ObjectId, ref: 'BugReportComment', default: null },
    attachments: { type: [commentAttachmentSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

bugReportCommentSchema.index({ bugReportId: 1, createdAt: 1 });

export type BugReportCommentDoc = InferSchemaType<typeof bugReportCommentSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const BugReportCommentModel = mongoose.model('BugReportComment', bugReportCommentSchema);
