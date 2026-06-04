import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const employeeSchema = new Schema(
  {
    empCode: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    gender: { type: String, enum: ['M', 'F', 'O'], required: true },
    department: { type: String, required: true, index: true },
    designation: { type: String, required: true },
    location: { type: String, required: true, index: true },
    timeShift: { type: String, enum: ['Day', 'Night'], required: true },
    alternateShift: { type: String, enum: ['A', 'B', 'C'], required: true },
    weeklyOff: { type: [String], default: ['Sunday'] },
    joinDate: { type: Date, required: true },
    biometricId: { type: String, required: true, unique: true, index: true },

    // SENSITIVE - stored unmasked at the DB level (the disk volume is encrypted by ops);
    // masked at the API serialisation layer. Unmasking is role-gated and audit-logged.
    pan: { type: String, required: true },
    aadhaar: { type: String, required: true },
    bankAccountNumber: { type: String, required: true },
    ifsc: { type: String, required: true },
    accountHolderName: { type: String, required: true },
    accountType: { type: String, enum: ['Savings', 'Current', 'Salary'], required: true },
    bankName: { type: String, required: true },
    pfNumber: { type: String, required: true },
    esiNumber: { type: String, required: true },

    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active', index: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

employeeSchema.index({ department: 1, location: 1, status: 1 });
employeeSchema.index({ location: 1, status: 1 });

export type EmployeeDoc = InferSchemaType<typeof employeeSchema> & { _id: mongoose.Types.ObjectId };
export const EmployeeModel = mongoose.model('Employee', employeeSchema);
