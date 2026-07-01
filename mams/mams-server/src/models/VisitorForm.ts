import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { normalizeVisitorLanguages } from '@mams/types';

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

const introImageSchema = new Schema(
  {
    source: { type: String, enum: ['url', 'upload'], required: true },
    url: { type: String, default: null },
    storageKey: { type: String, default: null },
    order: { type: Number, default: null },
  },
  { _id: false }
);

const introVideoSchema = new Schema(
  {
    source: { type: String, enum: ['youtube', 'loom', 'upload'], required: true },
    url: { type: String, default: null },
    storageKey: { type: String, default: null },
    viewingMandatory: { type: Boolean, default: false },
    order: { type: Number, default: null },
  },
  { _id: false }
);

const introSchema = new Schema(
  {
    image: { type: introImageSchema, default: null },
    video: { type: introVideoSchema, default: null },
    videoByLocale: {
      type: {
        gu: { type: introVideoSchema, default: null },
        hi: { type: introVideoSchema, default: null },
      },
      default: null,
      _id: false,
    },
  },
  { _id: false }
);

const localeContentSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    fields: { type: [visitorFieldSchema], default: [] },
  },
  { _id: false }
);

const visitorFormSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    intro: { type: introSchema, default: null },
    multilingual: {
      type: {
        enabled: { type: Boolean, default: false },
        languages: { type: [String], default: ['en'] },
      },
      default: () => normalizeVisitorLanguages({ enabled: false, languages: ['en'] }),
      _id: false,
    },
    translations: {
      type: {
        gu: { type: localeContentSchema, default: null },
        hi: { type: localeContentSchema, default: null },
      },
      default: null,
      _id: false,
    },
    publicSlug: { type: String, required: true, unique: true, index: true },
    retiredSlugs: { type: [retiredSlugSchema], default: [] },
    formVersion: { type: Number, default: 1 },
    fields: { type: [visitorFieldSchema], default: [] },
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
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
