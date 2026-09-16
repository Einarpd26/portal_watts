// Bolivia is UTC-4. All date helpers use that offset.
// A fixed offset is only valid because Bolivia does not observe daylight
// saving time — the -4h shift never changes across the year. If it did,
// subtracting a constant would drift by an hour part of the year and this
// approach would stop being correct; a real timezone (Intl/date-fns-tz,
// keyed by "America/La_Paz") would be required instead of arithmetic.

export function todayBolivia(): string {
  return new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
