export function formatDateTime(value?: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(value?: number | null, digits = 0): string {
  if (value == null || Number.isNaN(value)) return 'Not available';
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value?: number | null, digits = 1): string {
  if (value == null || Number.isNaN(value)) return 'Not available';
  return Number(value).toFixed(digits);
}

export function safeValue(value?: string | number | null, fallback = 'Not available'): string {
  if (value == null || value === '') return fallback;
  return String(value);
}
