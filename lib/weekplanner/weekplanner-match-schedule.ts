/**
 * Canonical match schedule mutation paths for Wochenplaner (R8A).
 *
 * SFV / provider-owned kickoff: startAt is never written from Wochenplaner;
 * operational end uses Event.operationalEndAtOverride.
 *
 * Manual matches: startAt/endAt on Event via matchcenter PATCH.
 */

const PROVIDER_PROTECTED_SOURCES = new Set(["SFV", "CLUBCORNER_FVNWS", "CSV_EXCEL_IMPORT"]);

export function isMatchScheduleExternallyOwned(eventSource: string | null | undefined): boolean {
  if (!eventSource) return false;
  return PROVIDER_PROTECTED_SOURCES.has(eventSource);
}

export async function saveMatchOperationalEndOverride(
  eventId: string,
  operationalEndAtIso: string | null,
): Promise<void> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/operational-end`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      operationalEndAtIso === null ? { reset: true } : { operationalEndAtOverride: operationalEndAtIso },
    ),
  });
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new Error(body?.error ?? "Endzeit konnte nicht gespeichert werden.");
  }
}

export async function saveManualMatchSchedule(
  eventId: string,
  startAtIso: string,
  endAtIso: string,
): Promise<void> {
  const res = await fetch(`/api/matchcenter/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startAt: startAtIso, endAt: endAtIso }),
  });
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new Error(body?.error ?? "Termin konnte nicht gespeichert werden.");
  }
}

export async function saveTournamentSchedule(
  eventId: string,
  startAtIso: string,
  endAtIso: string,
): Promise<void> {
  const res = await fetch(`/api/tournaments/${eventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startAt: startAtIso, endAt: endAtIso }),
  });
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    throw new Error(body?.error ?? "Termin konnte nicht gespeichert werden.");
  }
}
