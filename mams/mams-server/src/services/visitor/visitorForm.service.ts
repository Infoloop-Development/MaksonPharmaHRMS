import { randomBytes } from 'node:crypto';
import type { VisitorField } from '@mams/types';
import { env } from '../../config/env.js';
import { VisitorFormModel, type VisitorFormDoc } from '../../models/VisitorForm.js';

export function generatePublicSlug(): string {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

export function buildPublicUrl(slug: string): string {
  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  return `${base}/visit/${slug}`;
}

export async function findFormBySlug(slug: string): Promise<
  | { kind: 'active'; form: VisitorFormDoc }
  | { kind: 'retired' }
  | { kind: 'not_found' }
> {
  const active = await VisitorFormModel.findOne({ publicSlug: slug, isArchived: false });
  if (active) return { kind: 'active', form: active };

  const retired = await VisitorFormModel.findOne({
    isArchived: false,
    'retiredSlugs.slug': slug,
  });
  if (retired) return { kind: 'retired' };

  return { kind: 'not_found' };
}

export function serializeFormForPublic(form: VisitorFormDoc) {
  const fields = [...(form.fields as VisitorField[])].sort((a, b) => a.order - b.order);
  return {
    title: form.title,
    description: form.description,
    formVersion: form.formVersion,
    isActive: form.isActive,
    fields: fields.map((f) => ({
      id: f.id,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder ?? undefined,
      helpText: f.helpText ?? undefined,
      required: f.required,
      options: f.options ?? undefined,
      order: f.order,
      maxFileBytes: f.maxFileBytes ?? undefined,
    })),
  };
}

export function enrichFormResponse(form: VisitorFormDoc, submissionCount = 0) {
  return {
    _id: String(form._id),
    title: form.title,
    description: form.description,
    publicSlug: form.publicSlug,
    publicUrl: buildPublicUrl(form.publicSlug),
    formVersion: form.formVersion,
    fields: form.fields,
    isActive: form.isActive,
    isArchived: form.isArchived,
    submissionCount,
    createdBy: form.createdBy,
    updatedBy: form.updatedBy,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}
