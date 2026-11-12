import type { MeetingAgendaItemStatus } from "@prisma/client";
import { resolveStoredPersonDisplayName } from "@/lib/meetings/meeting-person-display";

export const MEETING_AGENDA_ITEM_STATUS_LABEL: Record<MeetingAgendaItemStatus, string> = {
  OPEN: "Offen",
  DISCUSSED: "Besprochen",
  SKIPPED: "Übersprungen",
};

export function formatAgendaPlannedDurationMin(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  return `${minutes} Min.`;
}

export function buildAgendaItemCollapsedMetadata(item: {
  owner: string | null;
  ownerPersonId: string | null;
  durationMin: number | null;
  status: MeetingAgendaItemStatus;
}): string[] {
  const parts: string[] = [];
  const ownerLabel = resolveStoredPersonDisplayName({
    name: item.owner,
    personId: item.ownerPersonId,
  });
  if (ownerLabel) parts.push(ownerLabel);
  const duration = formatAgendaPlannedDurationMin(item.durationMin);
  if (duration) parts.push(duration);
  parts.push(MEETING_AGENDA_ITEM_STATUS_LABEL[item.status]);
  return parts;
}
