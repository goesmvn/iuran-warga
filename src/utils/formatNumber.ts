/**
 * Format number to Indonesian Rupiah display format.
 * Always shows 2 decimal places and uses dot as thousand separator.
 * Example: formatRupiah(1500000) => "1.500.000,00"
 */
export function formatRupiah(value: number): string {
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format number input with thousand separator (dot).
 * Used for live formatting inside input fields.
 * Example: formatInputNumber("1500000") => "1.500.000"
 */
export function formatInputNumber(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (!cleaned) return '';
  return Number(cleaned).toLocaleString('id-ID');
}
