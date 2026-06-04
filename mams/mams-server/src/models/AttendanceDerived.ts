import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * Smart Anchor outputs + hours decomposition.
 * One record per (employee, date). Recomputed wholesale when raw punches arrive late
 * or when an adjustment is approved; previous state is captured in recomputeHistory.
 */
const attendanceDerivedSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD in IST

    // REAL view
    realEntryAt: { type: Date, default: null },
    realExitAt: { type: Date, default: null },
    realGrossHours: { type: Number, default: 0 },
    realNetHours: { type: Number, default: 0 },
    breakMinutes: { type: Number, default: 30 },

    // COMPLIANT view (Smart Anchor v2 output)
    compliantEntryAt: { type: Date, default: null },
    compliantExitAt: { type: Date, default: null },
    compliantHours: { type: Number, default: 0 },

    // Derived
    otHours: { type: Number, default: 0 },
    dayType: { type: String, enum: ['Working', 'Weekly Off', 'Absent'], default: 'Working' },
    status: { type: String, enum: ['Present', 'Absent', 'Weekly Off', 'Half Day'], default: 'Absent' },

    // Linkage
    rawRecordIds: [{ type: Schema.Types.ObjectId, ref: 'AttendanceRaw' }],
    appliedAdjustmentId: { type: Schema.Types.ObjectId, ref: 'Adjustment', default: null },

    // Audit
    computedAt: { type: Date, default: () => new Date() },
    computedFromSmartAnchorVersion: { type: String, default: 'v2.0.0' },
    recomputeHistory: [{
      recomputedAt: { type: Date, required: true },
      previousState: { type: Schema.Types.Mixed },
      reason: { type: String },
    }],
  },
  { timestamps: true }
);

attendanceDerivedSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceDerivedSchema.index({ date: 1, dayType: 1 });

export type AttendanceDerivedDoc = InferSchemaType<typeof attendanceDerivedSchema> & { _id: mongoose.Types.ObjectId };
export const AttendanceDerivedModel = mongoose.model('AttendanceDerived', attendanceDerivedSchema);
