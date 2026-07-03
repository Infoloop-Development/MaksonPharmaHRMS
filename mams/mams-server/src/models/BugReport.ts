import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const bugReportScreenshotSchema = new Schema(
  {
    mimeType: { type: String, default: null },
    data: { type: Buffer, default: null },
  },
  { _id: false }
);

const bugReportVideoSchema = new Schema(
  {
    filePath: { type: String, default: null },
    mimeType: { type: String, default: null },
    size: { type: Number, default: null },
    durationMs: { type: Number, default: null },
  },
  { _id: false }
);

const bugReportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'in_progress', 'resolved', 'closed'],
      default: 'new',
      index: true,
    },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    module: { type: String, required: true, index: true },
    route: { type: String, required: true },
    context: { type: Schema.Types.Mixed, default: {} },
    consoleLog: { type: [Schema.Types.Mixed], default: [] },
    breadcrumbs: { type: [Schema.Types.Mixed], default: [] },
    failedRequests: { type: [Schema.Types.Mixed], default: [] },
    screenshot: { type: bugReportScreenshotSchema, default: null },
    video: { type: bugReportVideoSchema, default: null },
  },
  { timestamps: true }
);

bugReportSchema.index({ status: 1, createdAt: -1 });
bugReportSchema.index({ createdAt: -1 });

export type BugReportDoc = InferSchemaType<typeof bugReportSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const BugReportModel = mongoose.model('BugReport', bugReportSchema);
