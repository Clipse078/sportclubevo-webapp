import { SWISS_QR_COMPLIANCE_CODES } from "./swiss-qr-compliance-codes";
import { SwissQrComplianceError } from "./swiss-qr-compliance-error";

const EXTRA_ALLOWED = new Set([
  0x0218, 0x0219, 0x021a, 0x021b, 0x20ac,
]);

function isAllowedCodePoint(codePoint: number): boolean {
  if (EXTRA_ALLOWED.has(codePoint)) {
    return true;
  }
  if (codePoint >= 0x0020 && codePoint <= 0x007e) {
    return true;
  }
  if (codePoint >= 0x00a0 && codePoint <= 0x00ff) {
    return true;
  }
  if (codePoint >= 0x0100 && codePoint <= 0x017f) {
    return true;
  }
  return false;
}

export function assertSwissQrPermittedCharacters(value: string, field: string): void {
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined || !isAllowedCodePoint(codePoint)) {
      throw new SwissQrComplianceError(
        SWISS_QR_COMPLIANCE_CODES.INVALID_CHARACTER,
        `${field} enthält ein nicht zulässiges Zeichen.`,
        field,
      );
    }
  }
}
