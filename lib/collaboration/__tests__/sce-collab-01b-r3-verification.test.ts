/**
 * SCE-COLLAB-01B-R3 — browser-discovered cumulative cycle regression (resource → time).
 * @vitest-environment jsdom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityChangeCollaborationProvider } from "@/components/admin/collaboration/ActivityChangeCollaborationContext";
import { applyCollaborationMutationResponse } from "@/lib/collaboration/client/collaboration-response";
import { buildMatchActivityChangeSet } from "@/lib/collaboration/match/match-activity-change";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import { buildTrainingActivityChangeSet } from "@/lib/collaboration/training/training-activity-change";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import { useCollaborationMutation } from "@/lib/collaboration/client/use-collaboration-mutation";
import {
  tournamentSnapshotToCycleBaseline,
  UNASSIGNED_RESOURCE_DISPLAY,
} from "@/lib/collaboration/activity-change/cycle-baseline";
import { buildCollaborationMutationResponse } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import { buildTournamentActivityChangeSet } from "@/lib/collaboration/tournament/tournament-activity-change";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildTournamentMutationCollaborationImpact } from "@/lib/collaboration/tournament/tournament-mutation-collaboration";

const mocks = vi.hoisted(() => ({
  loadTournamentActivitySnapshot: vi.fn(),
  resolveTournamentAudienceContext: vi.fn(),
  resolveContextualCommunicationSendAuthorization: vi.fn(),
  resolveCommunicationRecipients: vi.fn(),
}));

vi.mock("@/lib/collaboration/tournament/tournament-activity-snapshot", () => ({
  loadTournamentActivitySnapshot: mocks.loadTournamentActivitySnapshot,
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

function tourSnap(overrides: Partial<TournamentActivitySnapshot> = {}): TournamentActivitySnapshot {
  return {
    tournamentId: "tour-playmore",
    tenantId: "tenant-1",
    teamId: "team-1",
    teamName: "F3",
    teamSeasonId: "ts-1",
    title: "PlayMore Turnier",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-20",
    startTime: "10:00",
    endTime: "12:00",
    locationLabel: "Im Brüel",
    resourceLabel: null,
    playableVenueLabel: "Im Brüel",
    scheduleLine: null,
    ...overrides,
  };
}

function worthyImpact(changeSet: NonNullable<ActivityChangeImpact["changeSet"]>): ActivityChangeImpact {
  return {
    worthy: true,
    activityTitle: "PlayMore Turnier",
    activityScheduleLine: null,
    changeSet,
    audience: null,
    canCommunicate: true,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(ActivityChangeCollaborationProvider, null, children);
}

describe("SCE-COLLAB-01B-R3 server resource-first cycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveTournamentAudienceContext.mockResolvedValue({
      primaryTeamId: "team-1",
      teamIds: ["team-1", "team-2"],
      teamName: "Junioren F3",
      teamNamesLabel: "Junioren F3, Junioren F2",
    });
    mocks.resolveContextualCommunicationSendAuthorization.mockResolvedValue({ canCommunicate: true });
    mocks.resolveCommunicationRecipients.mockResolvedValue({ summary: { effectiveCount: 3 } });
  });

  it("R3-01 resource mutation returns original baseline (time T0, resource null)", async () => {
    const before = tourSnap();
    const afterResource = tourSnap({ resourceLabel: "Kunstrasen 2" });
    mocks.loadTournamentActivitySnapshot.mockResolvedValue(afterResource);

    const result = await buildTournamentMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      tournamentId: "tour-playmore",
      beforeSnapshot: before,
      cycleBaseline: null,
    });

    const payload = buildCollaborationMutationResponse(result);
    expect(payload.collaboration?.worthy).toBe(true);
    expect(payload.collaborationCycleBaseline).toEqual(
      expect.objectContaining({
        tournamentId: "tour-playmore",
        startTime: "10:00",
        resourceLabel: null,
      }),
    );
  });

  it("R3-02 time PATCH with stored baseline diffs from original baseline", async () => {
    const baseline = tournamentSnapshotToCycleBaseline(tourSnap());
    const beforePatch = tourSnap({ resourceLabel: "Kunstrasen 2" });
    const afterPatch = tourSnap({ resourceLabel: "Kunstrasen 2", startTime: "10:15" });
    mocks.loadTournamentActivitySnapshot.mockResolvedValue(afterPatch);

    const result = await buildTournamentMutationCollaborationImpact({
      tenantId: "tenant-1",
      tenantKey: "fca",
      userId: "user-1",
      tournamentId: "tour-playmore",
      beforeSnapshot: beforePatch,
      cycleBaseline: baseline,
    });

    const set = result.impact?.changeSet;
    expect(set?.entries.find((e) => e.field === "START_TIME")?.displayOld).toBe("10:00");
    expect(set?.entries.find((e) => e.field === "START_TIME")?.displayNew).toBe("10:15");
    expect(set?.entries.find((e) => e.field === "RESOURCE")?.displayOld).toBe(
      UNASSIGNED_RESOURCE_DISPLAY,
    );
    expect(set?.entries.find((e) => e.field === "RESOURCE")?.displayNew).toBe("Kunstrasen 2");
  });
});

describe("SCE-COLLAB-01B-R3 client lifecycle (resource → time)", () => {
  it("R3-03 second attachCycleBaseline still sends original baseline after resource response", () => {
    const baseline = tournamentSnapshotToCycleBaseline(tourSnap());
    const resourceChangeSet = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ resourceLabel: "Kunstrasen 2" }),
    )!;

    const { result } = renderHook(
      () => useCollaborationMutation("TOURNAMENT", "tour-playmore"),
      { wrapper },
    );

    act(() => {
      result.current.applyMutationCollaboration(
        {
          collaboration: worthyImpact(resourceChangeSet),
          collaborationCycleBaseline: baseline,
        },
        false,
      );
    });

    const attached = result.current.attachCycleBaseline({ startAt: "2026-10-20T10:15" });
    expect(attached.cycleRequested).toBe(true);
    expect(
      (attached.payload as { collaborationCycleBaseline: { resourceLabel: string | null } })
        .collaborationCycleBaseline.resourceLabel,
    ).toBeNull();
  });

  it("R3-05 third time edit retains original time baseline T0", () => {
    const baseline = tournamentSnapshotToCycleBaseline(tourSnap());
    const resourceChangeSet = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ resourceLabel: "Kunstrasen 2" }),
    )!;
    const cumulative = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ resourceLabel: "Kunstrasen 2", startTime: "10:15" }),
    )!;

    const { result } = renderHook(
      () => useCollaborationMutation("TOURNAMENT", "tour-playmore"),
      { wrapper },
    );

    act(() => {
      result.current.applyMutationCollaboration(
        {
          collaboration: worthyImpact(resourceChangeSet),
          collaborationCycleBaseline: baseline,
        },
        false,
      );
      result.current.applyMutationCollaboration(
        {
          collaboration: worthyImpact(cumulative),
          collaborationCycleBaseline: baseline,
        },
        true,
      );
    });

    const attached = result.current.attachCycleBaseline({ startAt: "2026-10-20T10:20" });
    expect(
      (attached.payload as { collaborationCycleBaseline: { startTime: string } }).collaborationCycleBaseline
        .startTime,
    ).toBe("10:00");
  });
});

function matchSnap(overrides: Partial<MatchActivitySnapshot> = {}): MatchActivitySnapshot {
  return {
    matchId: "match-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    teamName: "F2",
    teamSeasonId: "ts-1",
    title: "Spiel",
    status: "SCHEDULED",
    source: "MANUAL",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-15",
    startTime: "10:00",
    endTime: "11:30",
    locationLabel: "Im Brüel",
    pitchLabel: null,
    playableVenueLabel: "Im Brüel",
    dressingRoomLabel: null,
    scheduleLine: null,
    ...overrides,
  };
}

function trainingSnap(overrides: Partial<TrainingActivitySnapshot> = {}): TrainingActivitySnapshot {
  return {
    sessionId: "session-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    teamName: "F2",
    teamSeasonId: "ts-1",
    title: "Training",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-15",
    startTime: "18:00",
    endTime: "19:30",
    playableVenueLabel: null,
    dressingRoomLabel: null,
    scheduleLine: null,
    ...overrides,
  };
}

describe("SCE-COLLAB-01B-R3 cumulative semantics", () => {
  it("R3-04 composer changeSet includes resource + time after cumulative cycle", () => {
    const set = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ startTime: "10:15", resourceLabel: "Kunstrasen 2" }),
    );
    expect(set?.entries.some((e) => e.field === "START_TIME")).toBe(true);
    expect(set?.entries.some((e) => e.field === "RESOURCE")).toBe(true);
  });

  it("R3-06 resource reversion removes only resource delta", () => {
    const set = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ startTime: "10:15", resourceLabel: null }),
    );
    expect(set?.entries.some((e) => e.field === "RESOURCE")).toBe(false);
    expect(set?.entries.find((e) => e.field === "START_TIME")?.displayOld).toBe("10:00");
  });

  it("R3-07 time reversion after resource reversion clears net diff", () => {
    expect(buildTournamentActivityChangeSet(tourSnap(), tourSnap())).toBeNull();
  });

  it("R3-14 match resource → time cumulative", () => {
    const set = buildMatchActivityChangeSet(
      matchSnap(),
      matchSnap({ startTime: "10:15", pitchLabel: "Hauptfeld" }),
    );
    expect(set?.entries.some((e) => e.field === "RESOURCE")).toBe(true);
    expect(set?.entries.some((e) => e.field === "START_TIME")).toBe(true);
  });

  it("R3-15 match time → resource cumulative", () => {
    const set = buildMatchActivityChangeSet(
      matchSnap(),
      matchSnap({ startTime: "10:15", pitchLabel: "Hauptfeld" }),
    );
    expect(set?.entries.find((e) => e.field === "START_TIME")?.displayOld).toBe("10:00");
  });

  it("R3-16 training time ↔ resource cumulative regression", () => {
    const timeThenResource = buildTrainingActivityChangeSet(
      trainingSnap(),
      trainingSnap({ startTime: "18:15", playableVenueLabel: "Kunstrasen 2" }),
    );
    expect(timeThenResource?.entries.length).toBeGreaterThanOrEqual(2);
    const resourceThenTime = buildTrainingActivityChangeSet(
      trainingSnap(),
      trainingSnap({ startTime: "18:15", playableVenueLabel: "Kunstrasen 2" }),
    );
    expect(resourceThenTime?.entries.some((e) => e.field === "START_TIME")).toBe(true);
  });
});

describe("SCE-COLLAB-01B-R3 client apply guards", () => {
  it("R3-21 failed send does NOT clear cycle when cycle not requested", () => {
    const setImpact = vi.fn();
    const setCycleBaseline = vi.fn();
    applyCollaborationMutationResponse(
      { collaboration: null },
      { domain: "TOURNAMENT", activityId: "tour-playmore", cycleRequested: false },
      { setImpact, setCycleBaseline, getExistingCycleBaseline: () => tourSnap() as never },
    );
    expect(setImpact).not.toHaveBeenCalled();
    expect(setCycleBaseline).not.toHaveBeenCalled();
  });

  it("R3-22 zero-net clears cycle when cycle requested", () => {
    const setImpact = vi.fn();
    const setCycleBaseline = vi.fn();
    applyCollaborationMutationResponse(
      { collaboration: null, collaborationCycleBaseline: null },
      { domain: "TOURNAMENT", activityId: "tour-playmore", cycleRequested: true },
      { setImpact, setCycleBaseline },
    );
    expect(setImpact).toHaveBeenCalledWith(null);
    expect(setCycleBaseline).toHaveBeenCalledWith("TOURNAMENT", "tour-playmore", null);
  });

  it("R3-23 preserves baseline when impact updates without baseline field", () => {
    const baseline = tournamentSnapshotToCycleBaseline(tourSnap());
    const setImpact = vi.fn();
    const setCycleBaseline = vi.fn();
    const cumulative = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ startTime: "10:15", resourceLabel: "Kunstrasen 2" }),
    )!;
    applyCollaborationMutationResponse(
      { collaboration: worthyImpact(cumulative) },
      { domain: "TOURNAMENT", activityId: "tour-playmore", cycleRequested: true },
      {
        setImpact,
        setCycleBaseline,
        getExistingCycleBaseline: () => baseline,
      },
    );
    expect(setCycleBaseline).toHaveBeenCalledWith("TOURNAMENT", "tour-playmore", baseline);
  });

  it("R3-12 activity switch uses separate cycle keys", () => {
    const baselineA = tournamentSnapshotToCycleBaseline(tourSnap({ tournamentId: "tour-a" }));
    const { result: hookA } = renderHook(
      () => useCollaborationMutation("TOURNAMENT", "tour-a"),
      { wrapper },
    );
    act(() => {
      hookA.current.applyMutationCollaboration(
        {
          collaboration: worthyImpact(
            buildTournamentActivityChangeSet(
              tourSnap({ tournamentId: "tour-a" }),
              tourSnap({ tournamentId: "tour-a", resourceLabel: "KR2" }),
            )!,
          ),
          collaborationCycleBaseline: baselineA,
        },
        false,
      );
    });

    const { result: hookB } = renderHook(
      () => useCollaborationMutation("TOURNAMENT", "tour-b"),
      { wrapper },
    );
    expect(hookB.current.attachCycleBaseline({}).cycleRequested).toBe(false);
    expect(hookA.current.attachCycleBaseline({}).cycleRequested).toBe(true);
  });
});

describe("SCE-COLLAB-01B-R3 reset boundaries", () => {
  it("R3-09 router.refresh simulation does not clear cycle when provider stays mounted", async () => {
    const baseline = tournamentSnapshotToCycleBaseline(tourSnap());
    const resourceChangeSet = buildTournamentActivityChangeSet(
      tourSnap(),
      tourSnap({ resourceLabel: "Kunstrasen 2" }),
    )!;

    const { result, rerender } = renderHook(
      () => useCollaborationMutation("TOURNAMENT", "tour-playmore"),
      { wrapper },
    );

    act(() => {
      result.current.applyMutationCollaboration(
        {
          collaboration: worthyImpact(resourceChangeSet),
          collaborationCycleBaseline: baseline,
        },
        false,
      );
    });

    rerender();

    await waitFor(() => {
      expect(result.current.attachCycleBaseline({}).cycleRequested).toBe(true);
    });
  });
});
