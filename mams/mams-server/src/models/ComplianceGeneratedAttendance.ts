import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const complianceGeneratedAttendanceSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true },
    alternateShift: { type: String, enum: ['A', 'B', 'C'], required: true },
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date, required: true },
    checkOutNextDay: { type: Boolean, default: false },
    hoursWorked: { type: Number, required: true },
    status: { type: String, enum: ['Present'], default: 'Present' },
    generatedAt: { type: Date, default: () => new Date() },
    generatorVersion: { type: String, default: '1.0.0' },
  },
  { timestamps: true }
);

complianceGeneratedAttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
complianceGeneratedAttendanceSchema.index({ date: 1, alternateShift: 1 });

export type ComplianceGeneratedAttendanceDoc = InferSchemaType<
  typeof complianceGeneratedAttendanceSchema
> & { _id: mongoose.Types.ObjectId };

export const ComplianceGeneratedAttendanceModel = mongoose.model(
  'ComplianceGeneratedAttendance',
  complianceGeneratedAttendanceSchema
);
