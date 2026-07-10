import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const bugPhaseSchema = new Schema(
  {
    label: { type: String, required: true },
    order: { type: Number, required: true, index: true },
    isResolvedState: { type: Boolean, default: false },
    legacyKey: {
      type: String,
      enum: ['new', 'acknowledged', 'in_progress', 'resolved', 'closed'],
      default: null,
    },
  },
  { timestamps: true }
);

bugPhaseSchema.index({ order: 1 });

export type BugPhaseDoc = InferSchemaType<typeof bugPhaseSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const BugPhaseModel = mongoose.model('BugPhase', bugPhaseSchema);
