import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const visitorFieldSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['short_text', 'long_text', 'email', 'phone', 'date', 'time', 'dropdown', 'radio', 'checkbox', 'file'],
      required: true,
    },
    label: { type: String, required: true },
    placeholder: { type: String, default: null },
    helpText: { type: String, default: null },
    required: { type: Boolean, default: false },
    options: { type: [String], default: undefined },
    order: { type: Number, required: true },
    maxFileBytes: { type: Number, default: null },
  },
  { _id: false }
);

const retiredSlugSchema = new Schema(
  {
    slug: { type: String, required: true },
    retiredAt: { type: Date, required: true },
  },
  { _id: false }
);

const visitorFormSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    publicSlug: { type: String, required: true, unique: true, index: true },
    retiredSlugs: { type: [retiredSlugSchema], default: [] },
    formVersion: { type: Number, default: 1 },
    fields: { type: [visitorFieldSchema], default: [] },
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

visitorFormSchema.index({ 'retiredSlugs.slug': 1 });
visitorFormSchema.index({ isArchived: 1, updatedAt: -1 });

export type VisitorFormDoc = InferSchemaType<typeof visitorFormSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const VisitorFormModel = mongoose.model('VisitorForm', visitorFormSchema);
