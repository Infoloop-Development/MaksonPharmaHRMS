/**
 * Masking helpers for sensitive PII fields.
 * Show last 4 characters; replace the rest with X.
 * Used at the API serialisation layer.
 */
export function maskTail(value: string | null | undefined, visibleSuffixLength = 4): string {
  if (!value) return '';
  if (value.length <= visibleSuffixLength) {
    return 'X'.repeat(value.length);
  }
  const masked = 'X'.repeat(value.length - visibleSuffixLength);
  return masked + value.slice(-visibleSuffixLength);
}

export function maskAadhaar(value: string | null | undefined): string {
  if (!value) return '';
  // Show last 4 digits of the 12-digit Aadhaar, formatted as XXXX XXXX 1234
  const digits = value.replace(/\s+/g, '');
  if (digits.length !== 12) return maskTail(value);
  return `XXXX XXXX ${digits.slice(-4)}`;
}
