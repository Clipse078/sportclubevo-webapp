/**
 * Multi-line invitation email paste — validate and deduplicate.
 */

import { parseBulkEmailEntries } from "@/lib/communication/external-contacts/bulk-email-parser";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";
import { normalizePeopleAccessEmail } from "@/lib/admin/people-access/email-normalize";

export type BulkInvitationEmailRow = {
  raw: string;
  normalized: string | null;
  valid: boolean;
  duplicate: boolean;
  code?: string;
  message?: string;
  suggestion?: string;
};

export function parseAndValidateBulkInvitationEmails(raw: string): BulkInvitationEmailRow[] {
  const entries = parseBulkEmailEntries(raw);
  const seenNormalized = new Set<string>();
  const rows: BulkInvitationEmailRow[] = [];

  for (const rawLine of entries) {
    const syntax = validateInvitationEmailSyntax(rawLine, { allowTypoSuggestion: true });
    const normalized = syntax.normalized ? normalizePeopleAccessEmail(syntax.normalized) : null;
    const duplicate =
      normalized !== null && normalized !== "" && seenNormalized.has(normalized);
    if (normalized && !duplicate) {
      seenNormalized.add(normalized);
    }

    rows.push({
      raw: rawLine,
      normalized: syntax.ok ? normalized : normalized || null,
      valid: syntax.ok && !duplicate,
      duplicate,
      code: syntax.ok ? (duplicate ? "DUPLICATE" : "VALID") : syntax.code,
      message: duplicate
        ? "Doppelte E-Mail in der Liste."
        : syntax.ok
          ? undefined
          : syntax.message,
      suggestion: syntax.suggestion,
    });
  }

  return rows;
}

export function validNormalizedBulkEmails(rows: readonly BulkInvitationEmailRow[]): string[] {
  return rows.filter((r) => r.valid && r.normalized).map((r) => r.normalized as string);
}