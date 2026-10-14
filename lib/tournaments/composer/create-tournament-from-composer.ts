import { prisma } from "@/lib/db/prisma";
import { parseTenantLocalDateTimeInput, resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import {
  isAwayTournamentOrganiserMissing,
  resolvePersistedOrganizerNameFromComposerPayload,
} from "@/lib/tournaments/composer/tournament-composer-organiser";
import {
  orchestrateTournamentCreation,
  type TournamentCreationOrchestrationResult,
  type TournamentDressingRoomAllocationDraft,
  type TournamentParticipantDraft,
} from "@/lib/tournaments/create-tournament-orchestration";
import { addTournamentParticipant } from "@/lib/tournaments/participant-service";
import { addTournamentResourceAllocation } from "@/lib/tournaments/resource-allocation-service";
import { addParticipantDressingRoomAllocation } from "@/lib/tournaments/participant-allocation-service";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { resolveTournamentComposerPersistedLocation } from "@/lib/tournaments/tournament-create-validation";

export type CreateTournamentFromComposerResult = {
  eventId: string;
  orchestration: TournamentCreationOrchestrationResult;
};

function mapParticipantDraft(row: TournamentComposerDraftPayload["participants"][number]): TournamentParticipantDraft {
  return {
    localId: row.localId,
    kind: row.kind,
    teamId: row.teamId,
    externalClubId: row.externalClubId,
    displayName: row.displayName,
    manualLabel: row.manualLabel,
    externalTeamId: row.externalTeamId,
  };
}

export async function createTournamentFromComposerPayload(input: {
  tenantId: string;
  actorUserId: string;
  payload: TournamentComposerDraftPayload;
  reviewStage: "APPROVED" | "SUBMITTED" | "DRAFT";
}): Promise<CreateTournamentFromComposerResult> {
  const payload = input.payload;
  if (!payload.seasonId || !payload.title.trim() || !payload.startAt || payload.participants.length === 0) {
    throw new Error("Pflichtfelder fehlen.");
  }
  if (isAwayTournamentOrganiserMissing(payload)) {
    throw new Error("Bitte einen Veranstalter auswählen.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { timezone: true, name: true },
  });
  const tenantTimeZone = resolveTenantEventTimezone(tenant?.timezone);

  const startAt = parseTenantLocalDateTimeInput(payload.startAt, tenantTimeZone);
  if (!startAt) {
    throw new Error("Ungültiger Starttermin.");
  }

  let endAt: Date | null = null;
  if (payload.endAt.trim()) {
    endAt = parseTenantLocalDateTimeInput(payload.endAt, tenantTimeZone);
    if (!endAt) {
      throw new Error("Ungültiger Endtermin.");
    }
  }

  const primaryTeamId = payload.participants.find((p) => p.kind === "TEAM")?.teamId ?? null;
  const location = resolveTournamentComposerPersistedLocation(payload);
  const pub = payload.publication;
  const now = new Date();
  const approved = input.reviewStage === "APPROVED";

  const organizerName = resolvePersistedOrganizerNameFromComposerPayload(
    payload,
    tenant?.name ?? "",
  );

  const event = await prisma.event.create({
    data: {
      tenantId: input.tenantId,
      seasonId: payload.seasonId,
      teamId: primaryTeamId,
      type: "TOURNAMENT",
      source: "MANUAL",
      status: "SCHEDULED",
      reviewStage: input.reviewStage,
      reviewRequestedAt: approved ? null : now,
      reviewedAt: approved ? now : null,
      reviewedByUserId: approved ? input.actorUserId : null,
      approvedByUserId: approved ? input.actorUserId : null,
      createdByUserId: input.actorUserId,
      title: payload.title.trim(),
      description: payload.description.trim() || null,
      location,
      startAt,
      endAt,
      meetingTime: payload.meetingTime.trim() || null,
      organizerName,
      competitionLabel: payload.competitionLabel.trim() || null,
      homeAway: payload.homeAway,
      resultLabel: payload.resultLabel.trim() || null,
      remarks: payload.remarks.trim() || null,
      websiteVisible: pub.websiteVisible,
      infoboardVisible: pub.infoboardVisible,
      homepageVisible: pub.homepageVisible,
      wochenplanVisible: pub.wochenplanVisible,
      trainingsplanVisible: false,
      teamPageVisible: pub.teamPageVisible,
      sortOrder: 0,
    },
    select: { id: true },
  });

  const dressingRoomAllocations: TournamentDressingRoomAllocationDraft[] = payload.participants.flatMap(
    (participant) =>
      participant.dressingRooms.map((room) => ({
        participantLocalId: participant.localId,
        facilityResourceId: room.facilityResourceId,
      })),
  );

  const orchestration = await orchestrateTournamentCreation(
    {
      homeAway: payload.homeAway,
      participants: payload.participants.map(mapParticipantDraft),
      resourceAllocations: payload.resourceAllocations.map((r) => ({
        localId: r.localId,
        facilityResourceId: r.facilityResourceId,
      })),
      dressingRoomAllocations,
    },
    {
      createEvent: async () => event.id,
      addParticipant: async (tournamentId, draft) => {
        const created = await addTournamentParticipant(input.tenantId, tournamentId, {
          teamId: draft.kind === "TEAM" ? draft.teamId : undefined,
          externalClubId: draft.kind === "EXTERNAL_CLUB" ? draft.externalClubId : undefined,
          displayName: draft.displayName,
          externalTeamId: draft.kind === "EXTERNAL_TEAM" ? draft.externalTeamId : undefined,
          manualLabel: draft.kind === "MANUAL" ? draft.manualLabel : undefined,
        });
        return created.id;
      },
      addResourceAllocation: async (tournamentId, draft) => {
        await addTournamentResourceAllocation(input.tenantId, tournamentId, {
          facilityResourceId: draft.facilityResourceId,
        });
      },
      addDressingRoomAllocation: async (tournamentId, participantId, draft) => {
        await addParticipantDressingRoomAllocation(input.tenantId, participantId, {
          facilityResourceId: draft.facilityResourceId,
        });
      },
    },
  );

  return { eventId: event.id, orchestration };
}
