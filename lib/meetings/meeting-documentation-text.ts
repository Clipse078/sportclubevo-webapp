/**
 * SCE-CD-03R4 — optional Beschluss/Massnahme documentation text normalization.
 */

export const MEETING_DOCUMENTATION_TEXT_MAX = 8_000;

export type ParsedMeetingDocumentationText =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

export function parseOptionalMeetingDocumentationText(value: unknown): ParsedMeetingDocumentationText {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "Ungültiger Text." };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  if (trimmed.length > MEETING_DOCUMENTATION_TEXT_MAX) {
    return {
      ok: false,
      error: `Text darf höchstens ${MEETING_DOCUMENTATION_TEXT_MAX} Zeichen haben.`,
    };
  }
  return { ok: true, value: trimmed };
}
