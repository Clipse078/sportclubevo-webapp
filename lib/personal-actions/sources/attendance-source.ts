import { getAuthorizedPersonIdsForUser } from "@/lib/participation/authorization";
import { getParticipationEventKindLabel } from "@/lib/participation/labels";
import { buildParticipationPersonalActionId } from "../identity";
import type { PersonalAction } from "../types";
import type { PersonalActionSourceAdapter, PersonalActionSourceContext } from "./types";
import {
  filterActionableAttendanceCandidates,
  loadAttendanceObligationCandidates,
} from "./attendance-obligations";

function mapCandidateToPersonalAction(
  candidate: Awaited<ReturnType<typeof loadAttendanceObligationCandidates>>[number],
): PersonalAction {
  const eventRef =
    candidate.eventKind === "TRAINING"
      ? {
          eventKind: "TRAINING" as const,
          trainingSessionId: candidate.trainingSessionId!,
        }
      : {
          eventKind: candidate.eventKind,
          eventId: candidate.eventId!,
        };

  const eventKindLabel = getParticipationEventKindLabel(candidate.eventKind);

  return {
    id: buildParticipationPersonalActionId(candidate.personId, eventRef),
    sourceType: "ATTENDANCE_RESPONSE",
    sourceId: candidate.responseId,
    subject: {
      personId: candidate.personId,
      displayName: candidate.personDisplayName,
    },
    title: candidate.eventTitle,
    subtitle: `${eventKindLabel} · ${candidate.teamDisplayName}`,
    dueAt: null,
    status: "ACTIONABLE",
    href: null,
    actionKind: "PARTICIPATION_RESPONSE",
    context: {
      teamDisplayName: candidate.teamDisplayName,
      eventKind: candidate.eventKind,
      eventKindLabel,
      eventTitle: candidate.eventTitle,
      eventStartAt: candidate.eventStartAt.toISOString(),
    },
    inlineActions: {
      participation: {
        teamSeasonId: candidate.teamSeasonId,
        eventKind: candidate.eventKind,
        trainingSessionId: candidate.trainingSessionId,
        eventId: candidate.eventId,
        allowedResponses: ["YES", "NO", "MAYBE"],
      },
    },
  };
}

export const attendancePersonalActionSource: PersonalActionSourceAdapter = {
  sourceType: "ATTENDANCE_RESPONSE",

  async loadActionable(ctx: PersonalActionSourceContext): Promise<PersonalAction[]> {
    const personIds = await getAuthorizedPersonIdsForUser(ctx.tenantId, ctx.userId);
    const candidates = await loadAttendanceObligationCandidates(
      ctx.tenantId,
      personIds,
      ctx.now,
    );
    return filterActionableAttendanceCandidates(candidates).map(mapCandidateToPersonalAction);
  },

  async countActionable(ctx: PersonalActionSourceContext): Promise<number> {
    const personIds = await getAuthorizedPersonIdsForUser(ctx.tenantId, ctx.userId);
    const candidates = await loadAttendanceObligationCandidates(
      ctx.tenantId,
      personIds,
      ctx.now,
    );
    const actionable = filterActionableAttendanceCandidates(candidates);
    const ids = new Set(
      actionable.map((candidate) =>
        buildParticipationPersonalActionId(candidate.personId, {
          eventKind: candidate.eventKind,
          trainingSessionId: candidate.trainingSessionId,
          eventId: candidate.eventId,
        }),
      ),
    );
    return ids.size;
  },
};
