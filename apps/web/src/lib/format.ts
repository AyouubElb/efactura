const TIME_ZONE = 'Africa/Casablanca';

const MONTH = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const DAY = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const TIME = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});

export function monthInMorocco(now: Date = new Date()): string {
  const label = MONTH.format(now);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// "2026-10-05T09:42:00Z" → "05/10/2026", the day in Morocco
export function dayInMorocco(moment: string | Date): string {
  return DAY.format(new Date(moment));
}

// "2026-10-05T09:42:00Z" → "05/10/2026 10:42"
export function momentInMorocco(moment: string | Date): string {
  const date = new Date(moment);
  return `${DAY.format(date)} ${TIME.format(date)}`;
}
