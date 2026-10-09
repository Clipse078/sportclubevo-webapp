/**
 * SCE-COLLAB-01B-R7 — positive dispatch automated substitute (controlled fixtures).
 * Replaces impossible STAGE positive Human dispatch UAT; does not replace Human UX evidence.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAudienceCandidates } from "@/lib/communication/platform/recipient-resolution/audience-candidate-resolver";
import { buildOperationalAudienceForTeamIds } from "@/lib/collaboration/shared/operational-audience";
import { resolveTournamentAudienceContext } from "@/lib/collaboration/tournament/resolve-tournament-audience";
import { buildTournamentActivityChangeSet } from "@/lib/collaboration/tournament/tournament-activity-change";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";
import { TEAM_COMMUNICATION_NO_ELIGIBLE_RECIPIENTS_MESSAGE } from "@/lib/collaboration/contextual-communication-http";
import { buildActivityChangeOrchestrationMeta } from "@/lib/collaboration/activity-change/orchestration-meta";

const serviceMocks = vi.hoisted(() => ({
  loadTournamentActivitySnapshot: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
  resolveCommunicationRecipients: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  platformCommunicationFindMany: vi.fn(),
  platformCommunicationFindFirst: vi.fn(),
  platformCommunicationUpdate: vi.fn(),
  participantFindMany: vi.fn(),
  teamFindMany: vi.fn(),
  teamSeasonFindMany: vi.fn(),
  trainerTeamMemberFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: {
      findMany: serviceMocks.platformCommunicationFindMany,
      findFirst: serviceMocks.platformCommunicationFindFirst,
      update: serviceMocks.platformCommunicationUpdate,
    },
    tournamentParticipant: { findMany: serviceMocks.participantFindMany },
    team: { findMany: serviceMocks.teamFindMany },
    teamSeason: { findMany: serviceMocks.teamSeasonFindMany },
    trainerTeamMember: { findMany: serviceMocks.trainerTeamMemberFindMany },
  },
}));

vi.mock("@/lib/collaboration/tournament/tournament-activity-snapshot", () => ({
  loadTournamentActivitySnapshot: serviceMocks.loadTournamentActivitySnapshot,
}));

vi.mock("@/lib/collaboration/contextual-communication-authorization", () => ({
  resolveContextualCommunicationSendAuthorization: serviceMocks.resolveContextualCommunicationSendAuthorization,
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: serviceMocks.resolveCommunicationRecipients,
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: serviceMocks.createTeamCommunicationDraft,
  publishTeamCommunication: serviceMocks.publishTeamCommunication,
}));

import {
  prepareTournamentActivityChangeCommunicationDraft,
  publishPreparedTournamentActivityChangeCommunication,
  publishPreparedMatchActivityChangeCommunication,
} from "@/lib/collaboration/contextual-communication-service";

function tourSnap(overrides: Partial<TournamentActivitySnapshot> = {}): TournamentActivitySnapshot {
  return {
    tournamentId: "tour-playmore",
    tenantId: "tenant-1",
    teamId: "team-f3",
    teamName: "Junioren F3",
    teamSeasonId: "ts-f3",
    title: "PlayMore Turnier",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-20",
    startTime: "10:15",
    endTime: "12:00",
    locationLabel: "Im Brüel",
    resourceLabel: "Hauptfeld",
    playableVenueLabel: "Im Brüel",
    scheduleLine: "Montag · 10:15–12:00",
    ...overrides,
  };
}

const cumulativeChangeSet = buildTournamentActivityChangeSet(
  tourSnap({ startTime: "10:00", resourceLabel: "Kunstrasen 2" }),
  tourSnap({ startTime: "10:15", resourceLabel: "Hauptfeld" }),
)!;

describe("SCE-COLLAB-01B-R7 structural operational audience fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.teamFindMany.mockResolvedValue([{ id: "team-1", tenantId: "tenant-a" }]);
    serviceMocks.teamSeasonFindMany.mockResolvedValue([
      {
        playerSquadMembers: [
          { person: { id: "p-player", isActive: true, tenantId: "tenant-a" } },
        ],
        trainerTeamMembers: [
          { person: { id: "p-trainer", isActive: true, tenantId: "tenant-a" } },
        ],
      },
    ]);
    serviceMocks.trainerTeamMemberFindMany.mockResolvedValue([]);
  });

  it("R7-01 trainer person included in structural team audience candidates", async () => {
    const audience = buildOperationalAudienceForTeamIds(["team-1"]);
    const result = await resolveAudienceCandidates({ tenantId: "tenant-a", audience });
    expect(result.candidatePersonIds).toContain("p-trainer");
  });

  it("R7-02 player person included when policy permits structural roster", async () => {
    const audience = buildOperationalAudienceForTeamIds(["team-1"]);
    const result = await resolveAudienceCandidates({ tenantId: "tenant-a", audience });
    expect(result.candidatePersonIds).toContain("p-player");
  });

  it("R7-04 F2+F3 union spec is single multi-team structural component", () => {
    const spec = buildOperationalAudienceForTeamIds(["team-f2", "team-f3"]);
    expect(spec.components[0]?.structural?.teamIds).toEqual(["team-f2", "team-f3"]);
  });
});

describe("SCE-COLLAB-01B-R7 tournament external exclusion fixture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("R7-06 external participant teamId null excluded from audience ids", async () => {
    serviceMocks.participantFindMany.mockResolvedValue([
      { teamId: "team-f2", team: { id: "team-f2", name: "Junioren F2" } },
      { teamId: null, team: null },
    ]);
    serviceMocks.teamFindMany.mockResolvedValue([{ id: "team-f2", name: "Junioren F2" }]);
    const ctx = await resolveTournamentAudienceContext({
      tenantId: "tenant-1",
      tournamentId: "tour-1",
      eventTeamId: "team-f2",
    });
    expect(ctx?.teamIds).toEqual(["team-f2"]);
  });
});

describe("SCE-COLLAB-01B-R7 prepare/publish positive dispatch fixtures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.loadTournamentActivitySnapshot.mockResolvedValue(tourSnap());
    serviceMocks.participantFindMany.mockResolvedValue([
      { teamId: "team-f2", team: { id: "team-f2", name: "Junioren F2" } },
      { teamId: "team-f3", team: { id: "team-f3", name: "Junioren F3" } },
    ]);
    serviceMocks.teamFindMany.mockResolvedValue([
      { id: "team-f2", name: "Junioren F2" },
      { id: "team-f3", name: "Junioren F3" },
    ]);
    serviceMocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    serviceMocks.platformCommunicationFindMany.mockResolvedValue([]);
    serviceMocks.createTeamCommunicationDraft.mockResolvedValue({ id: "draft-r7" });
    serviceMocks.platformCommunicationFindFirst.mockResolvedValue({
      id: "draft-r7",
      subject: "Änderung: PlayMore",
      bodyText: cumulativeChangeSet.entries.map((e) => e.displayNew).join(" "),
      orchestrationMetaJson: buildActivityChangeOrchestrationMeta({
        activityDomain: "TOURNAMENT",
        activityId: "tour-playmore",
        changeFingerprint: cumulativeChangeSet.fingerprint,
        eventAnchor: {
          eventKind: "TOURNAMENT",
          eventId: "tour-playmore",
          teamSeasonId: "ts-f3",
          contextEventId: "tour-playmore",
        },
      }),
      conversation: { teamId: "team-f3" },
    });
    serviceMocks.platformCommunicationUpdate.mockResolvedValue({});
  });

  it("R7-07/R7-08 PREVIEW effectiveCount > 0 → canDispatch true", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 2 } });
    const prepared = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-trainer",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(prepared.recipientCount).toBe(2);
    expect(prepared.canDispatch).toBe(true);
    expect(serviceMocks.resolveCommunicationRecipients).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "PREVIEW" }),
    );
  });

  it("R7-10 publish invokes publishTeamCommunication (DISPATCH re-resolution path)", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 2 } });
    serviceMocks.publishTeamCommunication.mockResolvedValue({ id: "draft-r7", recipientCount: 2 });
    const out = await publishPreparedTournamentActivityChangeCommunication({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-trainer",
      teamId: "team-f3",
      draftId: "draft-r7",
      bodyText: preparedCumulativeBody(),
    });
    expect(out.recipientCount).toBe(2);
    expect(serviceMocks.publishTeamCommunication).toHaveBeenCalledWith(
      expect.objectContaining({
        preservePreparedAudience: true,
        communicationId: "draft-r7",
      }),
    );
  });

  it("R7-14 TOURNAMENT orchestration anchor on draft create", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 1 } });
    await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-trainer",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(serviceMocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        contextRef: { kind: "EVENT", eventId: "tour-playmore" },
        orchestrationMetaJson: expect.objectContaining({
          activityDomain: "TOURNAMENT",
          activityId: "tour-playmore",
        }),
      }),
    );
  });

  it("R7-24 cumulative multi-change body preserved through publish update", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 1 } });
    serviceMocks.publishTeamCommunication.mockResolvedValue({ id: "draft-r7", recipientCount: 1 });
    const body = preparedCumulativeBody();
    await publishPreparedTournamentActivityChangeCommunication({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-trainer",
      teamId: "team-f3",
      draftId: "draft-r7",
      bodyText: body,
    });
    expect(serviceMocks.platformCommunicationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bodyText: body }),
      }),
    );
    expect(body).toContain("10:00");
    expect(body).toContain("Hauptfeld");
  });

  it("R7-18 zero recipient at PREVIEW → canDispatch false (publish blocked in UI contract)", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 0 } });
    const prepared = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-trainer",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(prepared.canDispatch).toBe(false);
  });

  it("R7-19 recipient disappears between PREVIEW and DISPATCH → publish throws", async () => {
    serviceMocks.publishTeamCommunication.mockRejectedValue(
      new TeamCommunicationValidationError(TEAM_COMMUNICATION_NO_ELIGIBLE_RECIPIENTS_MESSAGE),
    );
    await expect(
      publishPreparedTournamentActivityChangeCommunication({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-trainer",
        teamId: "team-f3",
        draftId: "draft-r7",
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationValidationError);
  });

  it("R7-21 unauthorized actor cannot publish positive fixture", async () => {
    serviceMocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    await expect(
      publishPreparedTournamentActivityChangeCommunication({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-no-send",
        teamId: "team-f3",
        draftId: "draft-r7",
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationForbiddenError);
  });

  it("R7-20 cross-tenant draft missing → not found", async () => {
    serviceMocks.platformCommunicationFindFirst.mockResolvedValue(null);
    await expect(
      publishPreparedMatchActivityChangeCommunication({
        tenantId: "tenant-other",
        tenantKey: "fca",
        senderUserId: "user-trainer",
        teamId: "team-f3",
        draftId: "draft-r7",
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationNotFoundError);
  });

  it("R7-25 duplicate prepare reuses draft (no second PlatformCommunication)", async () => {
    serviceMocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 3 } });
    serviceMocks.platformCommunicationFindMany.mockResolvedValue([
      {
        id: "existing-draft",
        orchestrationMetaJson: {
          collaborationOrigin: "ACTIVITY_CHANGE",
          activityDomain: "TOURNAMENT",
          activityId: "tour-playmore",
          changeFingerprint: cumulativeChangeSet.fingerprint,
        },
      },
    ]);
    const result = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-trainer",
      tournamentId: "tour-playmore",
      changeSet: cumulativeChangeSet,
    });
    expect(result.reusedExistingDraft).toBe(true);
    expect(result.draftId).toBe("existing-draft");
    expect(serviceMocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
  });
});

function preparedCumulativeBody(): string {
  return buildTournamentActivityChangeSet(
    tourSnap({ startTime: "10:00", resourceLabel: "Kunstrasen 2" }),
    tourSnap({ startTime: "10:15", resourceLabel: "Hauptfeld" }),
  )!
    .entries.map((e) => `${e.displayOld} → ${e.displayNew}`)
    .join("\n");
}
