/**
 * Durable Traktandum ↔ Aufgabe link without schema migration (AUFGABEN-04 deferred).
 * Uses Task.seriesOccurrenceKey with a stable prefix + agenda item id + client idempotency id.
 */

const KEY_PREFIX = "sce-mtg-traktandum-task:v1" as const;

export function buildTraktandumTaskOccurrenceKey(agendaItemId: string, clientRequestId: string): string {
  const agenda = agendaItemId.trim();
  const client = clientRequestId.trim();
  if (!agenda || !client) {
    throw new Error("Traktandum-Aufgabe-Link erfordert Traktandum und Idempotenz-ID.");
  }
  return `${KEY_PREFIX}:${agenda}:${client}`;
}

export function traktandumTaskOccurrenceKeyPrefixForAgenda(agendaItemId: string): string {
  return `${KEY_PREFIX}:${agendaItemId.trim()}:`;
}

export function parseAgendaItemIdFromTraktandumTaskOccurrenceKey(
  occurrenceKey: string | null | undefined,
): string | null {
  if (!occurrenceKey?.startsWith(`${KEY_PREFIX}:`)) return null;
  const parts = occurrenceKey.split(":");
  // ["sce-mtg-traktandum-task", "v1", agendaId, clientId, ...]
  if (parts.length < 4) return null;
  const agendaId = parts[2]?.trim();
  return agendaId || null;
}