// 15 digits: "001234567000089"
export function isValidIceFormat(ice: string): boolean {
  return /^\d{15}$/.test(ice);
}
