// One spelling per account: " Karim@TechStore.example " → "karim@techstore.example"
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
