import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { DEFAULT_EXPORT_NAMING } from '@mams/types';

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
    exportNaming: {
      type: {
        companyCode: { type: String, default: DEFAULT_EXPORT_NAMING.companyCode },
        dateFormat: { type: String, enum: ['YYYYMMDD', 'DDMMYY'], default: DEFAULT_EXPORT_NAMING.dateFormat },
        includeGeneratedTimestamp: {
          type: Boolean,
          default: DEFAULT_EXPORT_NAMING.includeGeneratedTimestamp,
        },
        patterns: {
          dailyReportCsv: { type: String, default: DEFAULT_EXPORT_NAMING.patterns.dailyReportCsv },
          dashboardAttendanceXlsx: {
            type: String,
            default: DEFAULT_EXPORT_NAMING.patterns.dashboardAttendanceXlsx,
          },
        },
      },
      default: () => ({ ...DEFAULT_EXPORT_NAMING }),
    },
    leaveQuotaResetPolicy: {
      type: String,
      enum: ['calendar_year', 'financial_year', 'joining_anniversary'],
      default: 'calendar_year',
    },
    financialYearStartMonth: { type: Number, default: 4, min: 1, max: 12 },
    timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
    companyLogo: { type: String, default: null },
    favicon: { type: String, default: null },
    featureFlags: {
      type: {
        unmaskEnabled: { type: Boolean, default: null },
        autogenDemoEnabled: { type: Boolean, default: null },
        updatedAt: { type: Date, default: null },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      },
      default: () => ({
        unmaskEnabled: null,
        autogenDemoEnabled: null,
        updatedAt: null,
        updatedBy: null,
      }),
    },
  },
  { timestamps: true }
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema> & { _id: mongoose.Types.ObjectId };
export const SettingsModel = mongoose.model('Settings', settingsSchema);
