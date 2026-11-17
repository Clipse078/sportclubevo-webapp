/**
 * Conditional agenda-notes append for guided Sitzungsmodus (no schema changes).
 */

export function normalizeAgendaNotesForCompare(notes: string | null | undefined): string | null {
  const trimmed = notes?.trim();
  return trimmed ? trimmed : null;
}

export function mergeAgendaNotesAppend(existing: string | null | undefined, addition: string): string {
  const base = existing?.trim();
  const add = addition.trim();
  if (!add) return base ?? "";
  if (!base) return add;
  return `${base}\n\n${add}`;
}