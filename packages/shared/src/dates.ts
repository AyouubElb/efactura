// Dates are days in Morocco, "2026-09-26": the server runs on UTC
const moroccoDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Casablanca',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DAY_IN_MS = 86_400_000;

export function todayInMorocco(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    moroccoDay.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// 00:30 on 1 January in Casablanca is still 31 December in UTC
export function yearInMorocco(now: Date = new Date()): number {
  return Number(todayInMorocco(now).slice(0, 4));
}

// addDays("2026-09-26", 60) → "2026-11-25"
export function addDays(date: string, days: number): string {
  if (!Number.isInteger(days)) {
    throw new RangeError(`Not a whole number of days: ${days}`);
  }
  return new Date(parseDay(date) + days * DAY_IN_MS).toISOString().slice(0, 10);
}

function parseDay(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const time = match
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : NaN;
  // Date.UTC rolls 2026-02-30 over to March: the round trip catches it
  if (
    Number.isNaN(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(`Not a date: "${date}"`);
  }
  return time;
}
