import mongoose, {Schema, type InferSchemaType} from "mongoose";

const employeeChangeRequestSchema = new Schema(
    {
        changeType: { type: String, enum: ['create','update','delete'], required: true, index: true},
        employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true},
        proposedData: { type: Schema.Types.Mixed, default: null},
        previousData: { type: Schema.Types.Mixed, default: null},
        reason: { type: String, required: true, minLength: 10},
        status: { type: String, enum: ['Pending','Approved','Rejected'], default: 'Pending', index: true},
        initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true},
        initiatedAt: { type: Date, default: () => new Date()},
        initiatedFromIp: { type: String, default: null},
        decidedBy: {type: Schema.Types.ObjectId, ref: 'User', default: null},
        decidedAt: { type: Date, default: null},
        decidedFromIp: { type: String, default: null },
        approverNote: {type: String, default: null},
    },
    { timestamps: {createdAt: true, updatedAt: false}}
);

employeeChangeRequestSchema.index({status: 1,changeType: 1});
employeeChangeRequestSchema.index({initiatedBy: 1, status: 1});

export type EmployeeChanfeRequestDoc = InferSchemaType<typeof employeeChangeRequestSchema> & {
    _id: mongoose.Types.ObjectId;
}

export const EmployeeChangeRequestModel = mongoose.model('EmployeeChangeRequest', employeeChangeRequestSchema);