/**
 * SCE-COLLAB-01B — automated verification (match/tournament adapters, comm, security, isolation).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import { buildMatchActivityChangeSet } from "@/lib/collaboration/match/match-activity-change";
import { buildTournamentActivityChangeSet } from "@/lib/collaboration/tournament/tournament-activity-change";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

const mocks = vi.hoisted(() => ({
  loadMatchActivitySnapshot: vi.fn(),
  loadTournamentActivitySnapshot: vi.fn(),
  resolveMatchAudienceContext: vi.fn(),
  resolveTournamentAudienceContext: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
  resolveCommunicationRecipients: vi.fn(),
  platformCommunicationFindMany: vi.fn(),
  platformCommunicationFindFirst: vi.fn(),
  platformCommunicationUpdate: vi.fn(),
  createTeamCommunicationDraft: vi.fn(),
  publishTeamCommunication: vi.fn(),
  prismaTeamFindMany: vi.fn(),
  prismaParticipantFindMany: vi.fn(),
  prismaMappingFindFirst: vi.fn(),
}));

vi.mock("@/lib/collaboration/match/match-activity-snapshot", () => ({
  loadMatchActivitySnapshot: mocks.loadMatchActivitySnapshot,
}));

vi.mock("@/lib/collaboration/tournament/tournament-activity-snapshot", () => ({
  loadTournamentActivitySnapshot: mocks.loadTournamentActivitySnapshot,
}));

vi.mock("@/lib/collaboration/match/resolve-match-audience", () => ({
  resolveMatchAudienceContext: mocks.resolveMatchAudienceContext,
}));

vi.mock("@/lib/collaboration/tournament/resolve-tournament-audience", () => ({
  resolveTournamentAudienceContext: mocks.resolveTournamentAudienceContext,
}));

vi.mock("@/lib/collaboration/contextual-communication-authorization", () => ({
  resolveContextualCommunicationSendAuthorization: mocks.resolveContextualCommunicationSendAuthorization,
}));

vi.mock("@/lib/communication/platform/recipient-resolution/resolve-recipients", () => ({
  resolveCommunicationRecipients: mocks.resolveCommunicationRecipients,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    platformCommunication: {
      findMany: mocks.platformCommunicationFindMany,
      findFirst: mocks.platformCommunicationFindFirst,
      update: mocks.platformCommunicationUpdate,
    },
    team: { findMany: mocks.prismaTeamFindMany },
    tournamentParticipant: { findMany: mocks.prismaParticipantFindMany },
    matchExternalMapping: { findFirst: mocks.prismaMappingFindFirst },
  },
}));

vi.mock("@/lib/communication/team/team-communication-service", () => ({
  createTeamCommunicationDraft: mocks.createTeamCommunicationDraft,
  publishTeamCommunication: mocks.publishTeamCommunication,
}));

import { resolveMatchCollaborationImpactAfterChange } from "@/lib/collaboration/match/match-collaboration-impact-service";
import { resolveTournamentCollaborationImpactAfterChange } from "@/lib/collaboration/tournament/tournament-collaboration-impact-service";
import { buildMatchMutationCollaborationImpact } from "@/lib/collaboration/match/match-mutation-collaboration";
import { buildTournamentMutationCollaborationImpact } from "@/lib/collaboration/tournament/tournament-mutation-collaboration";
import {
  prepareMatchActivityChangeCommunicationDraft,
  prepareTournamentActivityChangeCommunicationDraft,
  publishPreparedMatchActivityChangeCommunication,
  publishPreparedTournamentActivityChangeCommunication,
} from "@/lib/collaboration/contextual-communication-service";

function matchSnap(overrides: Partial<MatchActivitySnapshot> = {}): MatchActivitySnapshot {
  return {
    matchId: "match-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    teamName: "Junioren F2",
    teamSeasonId: "ts-1",
    title: "Spiel",
    status: "SCHEDULED",
    source: "MANUAL",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-15",
    startTime: "18:30",
    endTime: "20:00",
    playableVenueLabel: "Im Brüel · KR2",
    dressingRoomLabel: null,
    scheduleLine: null,
    ...overrides,
  };
}

function tourSnap(overrides: Partial<TournamentActivitySnapshot> = {}): TournamentActivitySnapshot {
  return {
    tournamentId: "tour-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    teamName: "Junioren F2",
    teamSeasonId: "ts-1",
    title: "Turnier",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-20",
    startTime: "09:00",
    endTime: "12:00",
    playableVenueLabel: "Im Brüel · KR2",
    scheduleLine: null,
    ...overrides,
  };
}

describe("SCE-COLLAB-01B match audience + impact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 8 } });
    mocks.resolveMatchAudienceContext.mockResolvedValue({
      primaryTeamId: "team-1",
      teamIds: ["team-1"],
      teamName: "Junioren F2",
      teamNamesLabel: "Junioren F2",
    });
  });

  it("13 home SCE team audience", async () => {
    const impact = await resolveMatchCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: matchSnap(),
      after: matchSnap({ startTime: "19:30" }),
    });
    expect(impact?.audience?.teamId).toBe("team-1");
  });

  it("14 away assignment still uses canonical teamId", async () => {
    const impact = await resolveMatchCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: matchSnap({ teamId: "team-away" }),
      after: matchSnap({ teamId: "team-away", startTime: "19:30" }),
    });
    expect(mocks.resolveMatchAudienceContext).toHaveBeenCalled();
    expect(impact?.worthy).toBe(true);
  });

  it("17 zero recipients flagged", async () => {
    mocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 0 } });
    const impact = await resolveMatchCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: matchSnap(),
      after: matchSnap({ startTime: "19:30" }),
    });
    expect(impact?.audience?.zeroRecipients).toBe(true);
  });

  it("19 missing team — impact without communicate", async () => {
    mocks.resolveMatchAudienceContext.mockResolvedValue(null);
    const impact = await resolveMatchCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: matchSnap({ teamId: null }),
      after: matchSnap({ teamId: null, startTime: "19:30" }),
    });
    expect(impact?.canCommunicate).toBe(false);
    expect(impact?.worthy).toBe(true);
  });

  it("50 activity yes / communication no", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    const impact = await resolveMatchCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: matchSnap(),
      after: matchSnap({ startTime: "19:30" }),
    });
    expect(impact?.worthy).toBe(true);
    expect(impact?.canCommunicate).toBe(false);
    expect(mocks.resolveCommunicationRecipients).not.toHaveBeenCalled();
  });

  it("57 match impact assembly failure isolated", async () => {
    mocks.loadMatchActivitySnapshot.mockResolvedValue(matchSnap({ startTime: "19:30" }));
    mocks.resolveMatchAudienceContext.mockRejectedValue(new Error("boom"));
    const impact = await buildMatchMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      matchId: "match-1",
      beforeSnapshot: matchSnap(),
    });
    expect(impact).toBeNull();
  });
});

describe("SCE-COLLAB-01B tournament audience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 5 } });
    mocks.resolveTournamentAudienceContext.mockResolvedValue({
      primaryTeamId: "team-1",
      teamIds: ["team-1", "team-2"],
      teamName: "Junioren F2",
      teamNamesLabel: "Junioren F2, Junioren F3",
    });
  });

  it("32–33 multi-team audience metadata", async () => {
    const impact = await resolveTournamentCollaborationImpactAfterChange({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      before: tourSnap(),
      after: tourSnap({ startTime: "10:00" }),
    });
    expect(impact?.audience?.teamIds).toEqual(["team-1", "team-2"]);
  });

  it("58 tournament impact failure isolated", async () => {
    mocks.loadTournamentActivitySnapshot.mockRejectedValue(new Error("fail"));
    const impact = await buildTournamentMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      tournamentId: "tour-1",
      beforeSnapshot: tourSnap(),
    });
    expect(impact).toBeNull();
  });
});

describe("SCE-COLLAB-01B communication drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.platformCommunicationFindMany.mockResolvedValue([]);
    mocks.createTeamCommunicationDraft.mockResolvedValue({ id: "draft-1" });
    mocks.publishTeamCommunication.mockResolvedValue({ id: "draft-1", recipientCount: 3 });
    mocks.resolveMatchAudienceContext.mockResolvedValue({
      primaryTeamId: "team-1",
      teamIds: ["team-1"],
      teamName: "Junioren F2",
      teamNamesLabel: "Junioren F2",
    });
    mocks.resolveTournamentAudienceContext.mockResolvedValue({
      primaryTeamId: "team-1",
      teamIds: ["team-1"],
      teamName: "Junioren F2",
      teamNamesLabel: "Junioren F2",
    });
  });

  it("39–42 match prepare only with MATCH source context", async () => {
    mocks.loadMatchActivitySnapshot.mockResolvedValue(matchSnap({ startTime: "19:30" }));
    const changeSet = buildMatchActivityChangeSet(
      matchSnap(),
      matchSnap({ startTime: "19:30" }),
    )!;
    const result = await prepareMatchActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      matchId: "match-1",
      changeSet,
    });
    expect(result.reusedExistingDraft).toBe(false);
    expect(mocks.publishTeamCommunication).not.toHaveBeenCalled();
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        contextRef: { kind: "EVENT", eventId: "match-1" },
      }),
    );
    expect(result.subject).toContain("Spiel");
  });

  it("tournament prepare uses TOURNAMENT context", async () => {
    mocks.loadTournamentActivitySnapshot.mockResolvedValue(tourSnap({ startTime: "10:00" }));
    const changeSet = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ startTime: "10:00" }),
    )!;
    const result = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      tournamentId: "tour-1",
      changeSet,
    });
    expect(mocks.createTeamCommunicationDraft).toHaveBeenCalled();
    expect(result.subject).toContain("Turnier");
  });

  it("45 publish reauthorization denied", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    await expect(
      publishPreparedMatchActivityChangeCommunication({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-1",
        teamId: "team-1",
        draftId: "draft-1",
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationForbiddenError);
  });

  it("46 duplicate match draft reuse", async () => {
    mocks.loadMatchActivitySnapshot.mockResolvedValue(matchSnap({ startTime: "19:30" }));
    mocks.platformCommunicationFindMany.mockResolvedValue([
      {
        id: "existing-draft",
        orchestrationMetaJson: {
          collaborationOrigin: "ACTIVITY_CHANGE",
          activityDomain: "MATCH",
          activityId: "match-1",
          changeFingerprint: buildMatchActivityChangeSet(
            matchSnap(),
            matchSnap({ startTime: "19:30" }),
          )!.fingerprint,
        },
      },
    ]);
    const changeSet = buildMatchActivityChangeSet(
      matchSnap(),
      matchSnap({ startTime: "19:30" }),
    )!;
    const result = await prepareMatchActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      matchId: "match-1",
      changeSet,
    });
    expect(result.reusedExistingDraft).toBe(true);
    expect(result.draftId).toBe("existing-draft");
    expect(mocks.createTeamCommunicationDraft).not.toHaveBeenCalled();
  });

  it("44 explicit publish path", async () => {
    mocks.platformCommunicationFindFirst.mockResolvedValue({
      id: "draft-1",
      subject: "s",
      bodyText: "b",
      orchestrationMetaJson: {
        collaborationOrigin: "ACTIVITY_CHANGE",
        activityDomain: "MATCH",
        activityId: "match-1",
        changeFingerprint: "abc",
      },
      conversation: { teamId: "team-1" },
    });
    const out = await publishPreparedTournamentActivityChangeCommunication({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      teamId: "team-1",
      draftId: "draft-1",
      bodyText: "updated",
    });
    expect(out.recipientCount).toBe(3);
    expect(mocks.publishTeamCommunication).toHaveBeenCalled();
  });

  it("stale change set rejected", async () => {
    mocks.loadMatchActivitySnapshot.mockResolvedValue(matchSnap({ startTime: "18:30" }));
    const changeSet = buildMatchActivityChangeSet(
      matchSnap(),
      matchSnap({ startTime: "19:30" }),
    )!;
    await expect(
      prepareMatchActivityChangeCommunicationDraft({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-1",
        matchId: "match-1",
        changeSet,
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationValidationError);
  });

  it("47 tournament duplicate draft reuse by fingerprint", async () => {
    mocks.loadTournamentActivitySnapshot.mockResolvedValue(tourSnap({ startTime: "10:00" }));
    const fp = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ startTime: "10:00" }),
    )!.fingerprint;
    mocks.platformCommunicationFindMany.mockResolvedValue([
      {
        id: "t-draft",
        orchestrationMetaJson: {
          collaborationOrigin: "ACTIVITY_CHANGE",
          activityDomain: "TOURNAMENT",
          activityId: "tour-1",
          changeFingerprint: fp,
        },
      },
    ]);
    const changeSet = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ startTime: "10:00" }),
    )!;
    const result = await prepareTournamentActivityChangeCommunicationDraft({
      tenantId: "tenant-1",
      tenantKey: "fca",
      senderUserId: "user-1",
      tournamentId: "tour-1",
      changeSet,
    });
    expect(result.reusedExistingDraft).toBe(true);
    expect(result.draftId).toBe("t-draft");
  });

  it("48 match vs tournament fingerprint domain isolation", async () => {
    const matchSet = buildMatchActivityChangeSet(
      matchSnap(),
      matchSnap({ startTime: "19:30" }),
    )!;
    const tourSet = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ startTime: "19:30" }),
    )!;
    expect(matchSet.fingerprint).not.toEqual(tourSet.fingerprint);
  });

  it("49 prepare forbidden when service denies send", async () => {
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: false });
    mocks.loadMatchActivitySnapshot.mockResolvedValue(matchSnap({ startTime: "19:30" }));
    const changeSet = buildMatchActivityChangeSet(
      matchSnap(),
      matchSnap({ startTime: "19:30" }),
    )!;
    await expect(
      prepareMatchActivityChangeCommunicationDraft({
        tenantId: "tenant-1",
        tenantKey: "fca",
        senderUserId: "user-1",
        matchId: "match-1",
        changeSet,
      }),
    ).rejects.toBeInstanceOf(TeamCommunicationForbiddenError);
  });
});
