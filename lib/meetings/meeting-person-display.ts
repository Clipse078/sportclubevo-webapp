/**
 * Display helpers for meeting person references (chips, lists).
 */

const CUIDISH = /^[a-z0-9]{20,}$/i;

export function looksLikeOpaquePersonId(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  if (v.includes(" ")) return false;
  return CUIDISH.test(v);
}

export function meetingPersonFallbackLabel(personId: string): string {
  return `Person (${personId.slice(0, 8)}…)`;
}

export function resolveStoredPersonDisplayName(input: {
  name: string | null | undefined;
  personId: string | null | undefined;
  resolvedLabel?: string | null;
}): string | null {
  const resolved = input.resolvedLabel?.trim();
  if (resolved) return resolved;

  const name = input.name?.trim() ?? "";
  if (name && !looksLikeOpaquePersonId(name)) return name;

  if (input.personId?.trim()) {
    if (resolved) return resolved;
    return meetingPersonFallbackLabel(input.personId);
  }

  return name || null;
}

export function personLabelFromRecord(person: {
  displayName: string | null;
  firstName: string;
  lastName: string;
}): string {
  return person.displayName?.trim() || `${person.firstName} ${person.lastName}`.trim();
}
