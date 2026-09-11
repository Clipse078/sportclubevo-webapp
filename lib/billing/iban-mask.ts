const IBAN_LOG_SAFE_PATTERN = /\b[A-Z]{2}[0-9A-Z]{4,}\b/gi;

/** Masks IBAN / QR-IBAN for API, UI, and audit payloads (never log full values). */
export function maskIban(iban: string | null | undefined): string | null {
  if (!iban) return null;
  const normalized = iban.replace(/\s+/g, "").toUpperCase();
  if (normalized.length < 8) {
    return "****";
  }
  const visibleTail = normalized.slice(-4);
  return `****${visibleTail}`;
}

/** Redacts IBAN-like tokens in free-form log strings. */
export function redactIbanInText(text: string): string {
  return text.replace(IBAN_LOG_SAFE_PATTERN, (match) => maskIban(match) ?? "****");
}
