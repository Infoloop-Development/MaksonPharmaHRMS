import { z } from 'zod';

export const SensitiveUnmaskFieldSchema = z.enum([
  'pan',
  'aadhaar',
  'bankAccountNumber',
  'pfNumber',
  'esiNumber',
  'ifsc',
  'bankName',
  'accountHolderName',
  'accountType',
]);
export type SensitiveUnmaskField = z.infer<typeof SensitiveUnmaskFieldSchema>;

export const ALL_SENSITIVE_UNMASK_FIELDS: SensitiveUnmaskField[] = [
  'pan',
  'aadhaar',
  'bankAccountNumber',
  'pfNumber',
  'esiNumber',
  'ifsc',
  'bankName',
  'accountHolderName',
  'accountType',
];

export const SENSITIVE_UNMASK_FIELD_LABELS: Record<SensitiveUnmaskField, string> = {
  pan: 'PAN',
  aadhaar: 'Aadhaar',
  bankAccountNumber: 'Bank Account Number',
  pfNumber: 'PF Number',
  esiNumber: 'ESI Number',
  ifsc: 'IFSC',
  bankName: 'Bank',
  accountHolderName: 'Account Holder',
  accountType: 'Account Type',
};

export const UnmaskFieldGrantsSchema = z.array(SensitiveUnmaskFieldSchema);

export function dedupeUnmaskFieldGrants(grants: SensitiveUnmaskField[]): SensitiveUnmaskField[] {
  const seen = new Set<string>();
  const out: SensitiveUnmaskField[] = [];
  for (const g of grants) {
    if (!seen.has(g)) {
      seen.add(g);
      out.push(g);
    }
  }
  return out;
}
