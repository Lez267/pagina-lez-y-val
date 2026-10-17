export function dateLabel(date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`).toLocaleDateString('es-MX', options) : 'Sin fecha';
}
export function daysSince(date: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === type)?.value);
  const [year, month, day] = date.split('-').map(Number);
  return Math.max(0, Math.floor((Date.UTC(part('year'), part('month') - 1, part('day')) - Date.UTC(year, month - 1, day)) / 86400000));
}
