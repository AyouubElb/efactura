const MONTH = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Africa/Casablanca',
});

export function monthInMorocco(now: Date = new Date()): string {
  const label = MONTH.format(now);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
