import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import type { ReportJobStatus, ReportJobType } from '@mams/types';

const reportJobSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['compliance_monthly', 'financial'] satisfies ReportJobType[],
      required: true,
    },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'] satisfies ReportJobStatus[],
      required: true,
      default: 'queued',
      index: true,
    },
    yearMonth: { type: String, required: true },
    overrides: {
      type: [
        {
          employeeId: { type: String, required: true },
          totalHours: { type: Number, required: true },
        },
      ],
      default: [],
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, default: null },
    mimeType: { type: String, default: null },
    filePath: { type: String, default: null },
    errorMessage: { type: String, default: null },
    employeeCount: { type: Number, default: null },
    processedCount: { type: Number, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

reportJobSchema.index({ status: 1, createdAt: 1 });

export type ReportJobDoc = InferSchemaType<typeof reportJobSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ReportJobModel = mongoose.model('ReportJob', reportJobSchema);
