const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const hours = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const formatMoney = (n: number) => money.format(n);
export const formatHours = (n: number) => hours.format(n);

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Today in the user's time zone as yyyy-mm-dd (for <input type="date" max>). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parses a user-typed number; blank means 0, invalid means NaN. */
export function parseAmount(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, '');
  return cleaned === '' ? 0 : Number(cleaned);
}
