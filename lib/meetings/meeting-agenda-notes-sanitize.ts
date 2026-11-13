/**
 * Strip non-human technical markers from agenda notes before workspace/protocol output.
 */

const PENDENZ_REF_MARKER = /\[pendenz-ref:MeetingAction\/[^\]]+\]/g;

export function sanitizeMeetingAgendaNotesForDisplay(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;
  const cleaned = notes
    .split("\n")
    .map((line) => line.replace(PENDENZ_REF_MARKER, "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  return cleaned || null;
}
