import type { MeetingSubEntities } from "@/lib/meetings/queries";

type AgendaItem = MeetingSubEntities["agendaItems"][number];

/**
 * Vorhaben-linked context (summary or description) — distinct from protocol `notes`.
 */
export function resolveMeetingAgendaTopicBackground(item: Pick<AgendaItem, "initiative">): string | null {
  const initiative = item.initiative;
  if (!initiative) return null;
  const fromSummary = initiative.summary?.trim();
  if (fromSummary) return fromSummary;
  const fromDescription = initiative.description?.trim();
  if (fromDescription) return fromDescription;
  return null;
}