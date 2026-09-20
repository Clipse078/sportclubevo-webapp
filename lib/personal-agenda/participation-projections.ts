/**
 * AUFGABEN-05-NOTIFY-DEADLINE — personal RSVP deadline agenda projections.
 */

import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";
import { getParticipationEventKindLabel } from "@/lib/participation/labels";
import { buildParticipationPersonalActionId } from "@/lib/personal-actions/identity";
import {
  filterActionableAttendanceCandidates,
  loadAttendanceObligationCandidates,
} from "@/lib/personal-actions/sources/attendance-obligations";
import type { PersonalCalendarItem } from "./types";

export function buildParticipationAgendaProjectionId(
  personId: string,
  eventKind: "TRAINING" | "MATCH" | "TOURNAMENT",
  entityId: string,
): string {
  return buildParticipationPersonalActionId(personId, {
    eventKind,
    trainingSessionId: eventKind === "TRAINING" ? entityId : undefined,
    eventId: eventKind !== "TRAINING" ? entityId : undefined,
  });
}

export async function loadParticipationDeadlineProjections(input: {
  tenantId: string;
  userId: string;
  rangeStart: Date;
  rangeEnd: Date;
  now?: Date;
}): Promise<PersonalCalendarItem[]> {
  const personIds = await getAuthorizedPersonIdsForUser(input.tenantId, input.userId);
  if (personIds.length === 0) return [];

  const candidates = filterActionableAttendanceCandidates(
    await loadAttendanceObligationCandidates(
      input.tenantId,
      personIds,
      input.now ?? new Date(),
    ),
  );

  const items: PersonalCalendarItem[] = [];

  for (const candidate of candidates) {
    if (!candidate.participationResponseDueAt) continue;
    const dueAt = candidate.participationResponseDueAt;
    if (dueAt.getTime() < input.rangeStart.getTime() || dueAt.getTime() > input.rangeEnd.getTime()) {
      continue;
    }

    const entityId =
      candidate.eventKind === "TRAINING" ? candidate.trainingSessionId! : candidate.eventId!;
    const id = buildParticipationAgendaProjectionId(
      candidate.personId,
      candidate.eventKind,
      entityId,
    );
    const kindLabel = getParticipationEventKindLabel(candidate.eventKind);

    items.push({
      id,
      sourceType: "PARTICIPATION",
      title: "Teilnahme bestätigen",
      startAt: dueAt,
      endAt: null,
      href: "/dashboard/aufgaben?bereich=meine",
      typeLabel: "Teilnahme",
      subtitle: `${candidate.eventTitle} · ${candidate.teamDisplayName}`,
      eventType: candidate.eventKind === "TRAINING" ? undefined : candidate.eventKind,
      ariaLabel: `Teilnahme bestätigen, ${candidate.personDisplayName}, ${kindLabel}, Antwortfrist`,
    });
  }

  return items;
}
