export function toMonthStart(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function formatISODate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diff = toDate.getTime() - fromDate.getTime();
  return Math.max(1, Math.ceil(diff / 86_400_000));
}

export function addDays(date: string, days: number): string {
  const current = new Date(date);
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const current = new Date(date);
  current.setUTCMonth(current.getUTCMonth() + months);
  return current.toISOString().slice(0, 10);
}
