/** Compact one-line preview for collapsed Teilnehmer section header. */
export function formatMeetingParticipantsCollapsedPreview(
  names: string[],
  options?: { maxNames?: number; maxLength?: number },
): string | null {
  const trimmed = names.map((name) => name.trim()).filter((name) => name.length > 0);
  if (trimmed.length === 0) {
    return null;
  }
  const maxNames = options?.maxNames ?? 4;
  const shown = trimmed.slice(0, maxNames);
  const rest = trimmed.length - shown.length;
  let line = shown.join(", ");
  if (rest > 0) {
    line += ` +${rest}`;
  }
  const maxLength = options?.maxLength ?? 120;
  if (line.length > maxLength) {
    return `${line.slice(0, maxLength - 1)}…`;
  }
  return line;
}