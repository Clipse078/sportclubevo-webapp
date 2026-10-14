import { prisma } from "@/lib/db/prisma";
import { createPlanningAuthorizationPolicy } from "@/lib/planning/planning-authorization-policy";
import { parseTenantLocalDateTimeInput, resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import { resolveMatchComposerPersistedLocation } from "@/lib/matchcenter/match-create-validation";
import type { MatchComposerDraftPayload } from "./match-composer-draft-types";

export type CreateMatchFromComposerResult = {
  eventId: string;
  operationalFieldsError: string | null;
};

function resolveEffectiveOpponentName(payload: MatchComposerDraftPayload): string {
  const override = payload.opponentName.trim();
  if (payload.opponentExternalClubId) {
    return override || payload.opponentExternalClubName?.trim() || "Gegner";
  }
  return override;
}

function buildMatchTitle(payload: MatchComposerDraftPayload, opponent: string): string {
  const team = payload.teamDisplayName.trim();
  return team ? `${team} vs. ${opponent}` : `Match vs. ${opponent}`;
}

export async function createMatchFromComposerPayload(input: {
  tenantId: string;
  actorUserId: string;
  payload: MatchComposerDraftPayload;
  reviewStage: "APPROVED" | "SUBMITTED" | "DRAFT";
}): Promise<CreateMatchFromComposerResult> {
  const payload = input.payload;
  if (!payload.seasonId || !payload.teamId || !payload.startAt) {
    throw new Error("Pflichtfelder fehlen.");
  }

  const planningPolicy = createPlanningAuthorizationPolicy(prisma);
  const canCreate = await planningPolicy.canCreateForTeam(
    { userId: input.actorUserId, tenantId: input.tenantId },
    "match",
    payload.teamId,
  );
  if (!canCreate.allowed) {
    throw new Error(canCreate.reason ?? "Keine Schreibberechtigung für dieses Team.");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: input.tenantId },
    select: { timezone: true },
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

  const opponent = resolveEffectiveOpponentName(payload);
  const title = buildMatchTitle(payload, opponent);

  let resolvedOpponentExternalClubId: string | null = null;
  if (payload.opponentExternalClubId) {
    const externalClub = await prisma.externalClub.findFirst({
      where: { id: payload.opponentExternalClubId, tenantId: input.tenantId },
      select: { id: true, name: true, archivedAt: true },
    });
    if (!externalClub || externalClub.archivedAt) {
      throw new Error("Gegner-Verein nicht gefunden.");
    }
    resolvedOpponentExternalClubId = externalClub.id;
  }

  const location = resolveMatchComposerPersistedLocation(payload);
  const pub = payload.publication;
  const now = new Date();
  const approved = input.reviewStage === "APPROVED";

  const pitch = payload.resources.find((r) => r.kind === "pitch_hall");
  const homeRoom = payload.resources.find((r) => r.kind === "dressing_room_home");
  const awayRoom = payload.resources.find((r) => r.kind === "dressing_room_away");

  const event = await prisma.event.create({
    data: {
      tenantId: input.tenantId,
      seasonId: payload.seasonId,
      teamId: payload.teamId,
      type: "MATCH",
      source: "MANUAL",
      status: "SCHEDULED",
      reviewStage: input.reviewStage,
      reviewRequestedAt: approved ? null : now,
      reviewedAt: approved ? now : null,
      reviewedByUserId: approved ? input.actorUserId : null,
      approvedByUserId: approved ? input.actorUserId : null,
      createdByUserId: input.actorUserId,
      title,
      location,
      startAt,
      endAt,
      opponentName: payload.opponentName.trim() || opponent,
      opponentExternalClubId: resolvedOpponentExternalClubId,
      competitionLabel: payload.spielbetrieb.competitionLabel.trim() || null,
      homeAway: payload.homeAway,
      remarks: payload.spielbetrieb.remarks.trim() || null,
      websiteVisible: pub.websiteVisible,
      infoboardVisible: pub.infoboardVisible,
      homepageVisible: pub.homepageVisible,
      wochenplanVisible: pub.wochenplanVisible,
      trainingsplanVisible: false,
      teamPageVisible: pub.teamPageVisible,
      sortOrder: 0,
      pitchCode:
        payload.homeAway === "HOME" && pitch?.code ? pitch.code : null,
      homeDressingRoomCode:
        payload.homeAway === "HOME" && homeRoom?.code ? homeRoom.code : null,
      awayDressingRoomCode:
        payload.homeAway === "HOME" && awayRoom?.code ? awayRoom.code : null,
    },
    select: { id: true },
  });

  return { eventId: event.id, operationalFieldsError: null };
}
