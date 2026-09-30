// DV-2026-0009, and DV-2026-0009-v2 for a revision; null while a first draft
export function displayNumber(
  number: string | null,
  version = 1,
): string | null {
  if (!number) {
    return null;
  }
  return version > 1 ? `${number}-v${version}` : number;
}

// A fixed place per number, and per validity date for a quote: a second make lands on the first
export function pdfKey(display: string, validUntil: string | null): string {
  const [series, year] = display.split('-');
  const suffix = validUntil ? `_${validUntil}` : '';
  return `documents/${series}/${year}/${display}${suffix}.pdf`;
}

// Prisma returns a @db.Date as midnight UTC: "2026-09-03"
export function isoDay(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
