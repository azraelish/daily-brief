export function todayUTC(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function yesterdayUTC(d: Date = new Date()): string {
  const y = new Date(d);
  y.setUTCDate(y.getUTCDate() - 1);
  return y.toISOString().slice(0, 10);
}

export function formatLong(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
