export function formatKWD(amount: number): string {
  return `KWD ${amount.toFixed(3)}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function signedFloat(val?: number | null): string {
  if (val == null) return '—';
  return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
}

export function formatAxis(val?: number | null): string {
  if (val == null) return '—';
  return `${val}°`;
}
