import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const leaveApplicationSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    fromDate: { type: String, required: true },
    toDate: { type: String, required: true },
    totalDays: { type: Number, required: true },
    halfDayPortion: { type: String, enum: ['first', 'second'], default: null },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    appliedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appliedAt: { type: Date, default: () => new Date() },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    approverNote: { type: String, default: null },
    notifyEmployee: { type: Boolean, default: false },
    excludedHolidayDates: { type: [String], default: [] },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leaveApplicationSchema.index({ employeeId: 1, fromDate: 1, toDate: 1 });
leaveApplicationSchema.index({ status: 1, appliedAt: -1 });

export type LeaveApplicationDoc = InferSchemaType<typeof leaveApplicationSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const LeaveApplicationModel = mongoose.model('LeaveApplication', leaveApplicationSchema);
