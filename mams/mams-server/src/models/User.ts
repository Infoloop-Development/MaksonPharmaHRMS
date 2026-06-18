import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['hr.admin', 'hr.compliance', 'it.admin'], required: true, index: true },
    permissions: { type: [String], default: [] },
    unmaskFieldGrants: { type: [String], default: [] },
    viewMode: { type: String, enum: ['real', 'compliant'], required: true },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    completedOnboardingTours: { type: [String], default: [] },
    dashboardLayout: {
      type: {
        rows: [
          {
            items: { type: [String], enum: ['bar', 'donut', 'table'] },
          },
        ],
        order: { type: [String], enum: ['bar', 'donut', 'table'] },
        mobileChart: { type: String, enum: ['both', 'bar', 'donut'] },
      },
      required: false,
      default: undefined,
    },
    dashboardKpi: {
      type: {
        slots: {
          type: [String],
          enum: [
            'total_active',
            'present',
            'absent',
            'late',
            'on_time',
            'attendance_rate',
            'weekly_off',
            'half_day',
            'day_shift',
            'night_shift',
          ],
        },
      },
      required: false,
      default: undefined,
    },
  },
  { timestamps: true }
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const UserModel = mongoose.model('User', userSchema);
