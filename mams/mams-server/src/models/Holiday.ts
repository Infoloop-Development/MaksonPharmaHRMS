import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const holidaySchema = new Schema(
  {
    name: { type: String, required: true },
    date: { type: String, required: true, index: true },
    type: { type: String, enum: ['National', 'Regional', 'Company'], default: 'National' },
    departments: { type: [String], default: [] },
    locations: { type: [String], default: [] },
  },
  { timestamps: true }
);

holidaySchema.index({ date: 1, name: 1 });

export type HolidayDoc = InferSchemaType<typeof holidaySchema> & { _id: mongoose.Types.ObjectId };
export const HolidayModel = mongoose.model('Holiday', holidaySchema);
