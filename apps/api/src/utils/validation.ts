const MOBILE_PATTERN = /^(?:\+91|91)?[6-9]\d{9}$/;

export function normalizeIndianPhone(value: string): string {
  return value.replace(/[\s()-]/g, "");
}

export function isIndianPhone(value: string): boolean {
  return MOBILE_PATTERN.test(normalizeIndianPhone(value));
}

export function isIndianPin(value: string): boolean {
  return /^[1-9]\d{5}$/.test(value.trim());
}
