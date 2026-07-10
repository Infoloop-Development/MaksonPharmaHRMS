import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: {
      type: String,
      enum: [
        'visitor_submitted',
        'leave_applied',
        'device_registered',
        'bug_assigned',
        'bug_mentioned',
        'bug_resolved',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    href: { type: String, default: null },
    entityType: { type: String, default: null },
    entityId: { type: Schema.Types.ObjectId, default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const NotificationModel = mongoose.model('Notification', notificationSchema);
