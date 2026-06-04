import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';

const deviceSchema = new Schema(
  {
    deviceCode: { type: String, required: true },
    serialNumber: { type: String, required: true, unique: true, index: true },
    vendor: { type: String, enum: ['eSSL', 'Hanvon'], default: 'eSSL', index: true },
    protocolMode: { type: String, enum: ['push', 'pull'], default: 'push' },
    integrationConfig: {
      type: {
        pushToken: { type: String, default: null },
        pullBaseUrl: { type: String, default: null },
        apiKey: { type: String, default: null },
        pullIntervalMinutes: { type: Number, default: null },
      },
      default: () => ({}),
      _id: false,
    },
    model: { type: String, required: true },
    name: { type: String, required: true },
    department: { type: String, default: null, index: true },
    location: { type: String, required: true, index: true },
    ipAddress: { type: String, default: null },
    lastPingAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, enum: ['ok', 'error', 'pending', null], default: null },
    lastSyncError: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export type DeviceDoc = HydratedDocument<InferSchemaType<typeof deviceSchema>>;
export const DeviceModel = mongoose.model('Device', deviceSchema);
