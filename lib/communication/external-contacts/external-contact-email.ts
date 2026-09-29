/**
 * SCE-ZIELGRUPPEN-02 — canonical email normalization for external contacts.
 */

import { normalizePeopleAccessEmail } from "@/lib/admin/people-access/email-normalize";
import { validateInvitationEmailSyntax } from "@/lib/admin/people-access/email-validation";

export function normalizeCommunicationExternalContactEmail(raw: string): string | null {
  const normalized = normalizePeopleAccessEmail(raw);
  if (!normalized.includes("@")) return null;
  const result = validateInvitationEmailSyntax(normalized);
  return result.ok ? result.normalized : null;
}

export function classifyCommunicationExternalEmail(raw: string): {
  ok: boolean;
  normalized: string;
  suggestion?: string;
  message?: string;
} {
  const normalized = normalizePeopleAccessEmail(raw.trim());
  if (!normalized) {
    return { ok: false, normalized: "", message: "Leere Adresse." };
  }
  const result = validateInvitationEmailSyntax(normalized);
  if (result.ok) {
    return { ok: true, normalized: result.normalized };
  }
  return {
    ok: false,
    normalized: result.normalized || normalized,
    suggestion: result.suggestion,
    message: result.message,
  };
}
