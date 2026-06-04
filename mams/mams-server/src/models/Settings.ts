import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * Singleton: there is exactly one Settings document.
 * The seed script creates it; the Settings page edits it.
 */
const shiftWindowSchema = new Schema(
  {
    id: { type: String, required: true },
    start: { type: String, required: true }, // 'HH:MM'
    end: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const settingsSchema = new Schema(
  {
    companyName: { type: String, default: 'Makson Pharmaceuticals (India) Pvt. Ltd.' },
    cin: { type: String, default: 'U24231GJ1986PTC008718' },
    gstin: { type: String, default: '24AABCM2806L1ZM' },
    pfRegistrationNumber: { type: String, default: '' },
    esiRegistrationNumber: { type: String, default: '' },
    factoryLicenceNumber: { type: String, default: '' },
    registeredAddress: { type: String, default: '195, Rajkot Highway, Surendranagar, Wadhwancity, Gujarat 363020' },
    signatoryName: { type: String, default: 'Mrs. Komal Makasana' },
    signatoryDesignation: { type: String, default: 'CFO & Partner' },
    weeklyOffDefault: { type: [String], default: ['Sunday'] },
    realShifts: {
      type: [shiftWindowSchema],
      default: [
        { id: 'Day', start: '06:00', end: '18:00', label: 'Day Shift' },
        { id: 'Night', start: '18:00', end: '06:00', label: 'Night Shift' },
      ],
    },
    complianceShifts: {
      type: [shiftWindowSchema],
      default: [
        { id: 'A', start: '06:00', end: '14:00', label: 'A - Morning' },
        { id: 'B', start: '14:00', end: '22:00', label: 'B - Afternoon' },
        { id: 'C', start: '22:00', end: '06:00', label: 'C - Night' },
      ],
    },
    smartAnchorEnabled: { type: Boolean, default: true },
    smartAnchorVersion: { type: String, default: 'v2.0.0' },
    confidentialityNoticeEnabled: { type: Boolean, default: true },
    confidentialityNoticeText: {
      type: String,
      default: 'This system contains confidential employee data. Unauthorised access is prohibited.',
    },
    /** Last issued employee numeric suffix (MKS####). Incremented on each server-allocated hire. */
    employeeCodeSequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema> & { _id: mongoose.Types.ObjectId };
export const SettingsModel = mongoose.model('Settings', settingsSchema);
