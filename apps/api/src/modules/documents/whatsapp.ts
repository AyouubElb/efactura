// "06 12 34 56 78", "612345678", "+212 06…", "00212…" → "212612345678"; null when it isn't a phone number
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) {
    return null;
  }
  let digits = phone.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (/^0?[5-7]\d{8}$/.test(digits)) {
    digits = `212${digits.slice(-9)}`;
  }
  // A 0 kept after the country code: 2120612345678
  if (/^2120[5-7]\d{8}$/.test(digits)) {
    digits = `212${digits.slice(4)}`;
  }
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

// Opens the person's own WhatsApp with the message ready; without a number, WhatsApp asks who to send to
export function whatsappUrl(phone: string | null, text: string): string {
  return `https://wa.me/${whatsappNumber(phone) ?? ''}?text=${encodeURIComponent(text)}`;
}
