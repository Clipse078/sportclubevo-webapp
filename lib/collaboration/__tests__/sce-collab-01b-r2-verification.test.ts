/**
 * SCE-COLLAB-01B-R2 — cumulative unresolved collaboration cycle + presentation.
 */

import { describe, expect, it, vi } from "vitest";
import {
  mergeTournamentCycleBaselineWithAfter,
  tournamentSnapshotToCycleBaseline,
  UNASSIGNED_RESOURCE_DISPLAY,
} from "@/lib/collaboration/activity-change/cycle-baseline";
import { finalizeCollaborationMutationCycle } from "@/lib/collaboration/activity-change/resolve-mutation-collaboration-cycle";
import {
  applyCollaborationMutationResponse,
  extractCollaborationImpact,
} from "@/lib/collaboration/client/collaboration-response";
import { buildMatchActivityChangeSet } from "@/lib/collaboration/match/match-activity-change";
import { buildTournamentActivityChangeSet as buildTourSet } from "@/lib/collaboration/tournament/tournament-activity-change";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";

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

function tourSnap(overrides: Partial<TournamentActivitySnapshot> = {}): TournamentActivitySnapshot {
  return {
    tournamentId: "tour-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    teamName: "F2",
    teamSeasonId: "ts-1",
    title: "Turnier",
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
    activityTitle: "T",
    activityScheduleLine: null,
    changeSet,
    audience: null,
    canCommunicate: true,
  };
}

describe("SCE-COLLAB-01B-R2 tournament cumulative net diff", () => {
  const baseline = tourSnap();

  it("time then resource accumulates original→latest", () => {
    const afterTime = tourSnap({ startTime: "10:15" });
    const afterBoth = tourSnap({ startTime: "10:16", resourceLabel: "Kunstrasen 2" });
    const set = buildTourSet(baseline, afterBoth);
    expect(set?.entries.find((e) => e.field === "START_TIME")?.displayOld).toBe("10:00");
    expect(set?.entries.find((e) => e.field === "START_TIME")?.displayNew).toBe("10:16");
    expect(set?.entries.find((e) => e.field === "RESOURCE")?.displayNew).toBe("Kunstrasen 2");
    expect(buildTourSet(afterTime, afterBoth)?.entries.find((e) => e.field === "START_TIME")?.displayOld).toBe(
      "10:15",
    );
    expect(buildTourSet(afterTime, afterBoth)?.entries.find((e) => e.field === "START_TIME")?.displayNew).toBe(
      "10:16",
    );
  });

  it("resource none→KR2→Hauptfeld becomes none→Hauptfeld", () => {
    const set = buildTourSet(
      baseline,
      tourSnap({ resourceLabel: "Hauptfeld" }),
    );
    const resource = set?.entries.find((e) => e.field === "RESOURCE");
    expect(resource?.displayOld).toBe(UNASSIGNED_RESOURCE_DISPLAY);
    expect(resource?.displayNew).toBe("Hauptfeld");
  });

  it("reverted time removes START_TIME delta", () => {
    expect(buildTourSet(baseline, tourSnap({ startTime: "10:00" }))).toBeNull();
  });

  it("reverted resource removes RESOURCE delta", () => {
    const mid = tourSnap({ resourceLabel: "KR2" });
    expect(buildTourSet(baseline, mid)?.entries.some((e) => e.field === "RESOURCE")).toBe(true);
    expect(buildTourSet(baseline, tourSnap({ resourceLabel: null }))).toBeNull();
  });

  it("venue-only uses Ort; resource-only uses Spielfeld", () => {
    const venue = buildTourSet(baseline, tourSnap({ locationLabel: "Gartenhof" }));
    expect(venue?.entries.some((e) => e.field === "VENUE")).toBe(true);
    const resource = buildTourSet(baseline, tourSnap({ resourceLabel: "KR2" }));
    expect(resource?.entries.some((e) => e.field === "RESOURCE")).toBe(true);
    expect(resource?.entries.some((e) => e.field === "VENUE")).toBe(false);
  });
});

describe("SCE-COLLAB-01B-R2 match cumulative net diff", () => {
  it("time + pitch across merged baseline", () => {
    const baseline = matchSnap();
    const after = matchSnap({ startTime: "10:16", pitchLabel: "Hauptfeld" });
    const set = buildMatchActivityChangeSet(baseline, after);
    expect(set?.entries.some((e) => e.field === "START_TIME")).toBe(true);
    expect(set?.entries.some((e) => e.field === "RESOURCE")).toBe(true);
  });

  it("pitch-only shows Spielfeld not Ort noise", () => {
    const set = buildMatchActivityChangeSet(
      matchSnap({ pitchLabel: null }),
      matchSnap({ pitchLabel: "Hauptfeld" }),
    );
    expect(set?.entries.some((e) => e.field === "VENUE")).toBe(false);
    expect(set?.entries.find((e) => e.field === "RESOURCE")?.displayOld).toBe(
      UNASSIGNED_RESOURCE_DISPLAY,
    );
  });
});

describe("SCE-COLLAB-01B-R2 cycle baseline merge", () => {
  it("mergeTournamentCycleBaselineWithAfter preserves first baseline fields", () => {
    const baseline = tournamentSnapshotToCycleBaseline(tourSnap());
    const after = tourSnap({ startTime: "10:16", resourceLabel: "KR2" });
    const merged = mergeTournamentCycleBaselineWithAfter(baseline, after);
    const set = buildTourSet(merged, after);
    expect(set?.entries.find((e) => e.field === "START_TIME")?.displayOld).toBe("10:00");
  });
});

describe("SCE-COLLAB-01B-R2 client apply semantics", () => {
  it("preserves pending impact when response has no collaboration and cycle not requested", () => {
    const setImpact = vi.fn();
    const setCycleBaseline = vi.fn();
    applyCollaborationMutationResponse(
      { collaboration: null },
      { domain: "TOURNAMENT", activityId: "tour-1", cycleRequested: false },
      { setImpact, setCycleBaseline },
    );
    expect(setImpact).not.toHaveBeenCalled();
    expect(setCycleBaseline).not.toHaveBeenCalled();
  });

  it("clears cycle when cycle requested and response empty", () => {
    const setImpact = vi.fn();
    const setCycleBaseline = vi.fn();
    applyCollaborationMutationResponse(
      { collaboration: null, collaborationCycleBaseline: null },
      { domain: "TOURNAMENT", activityId: "tour-1", cycleRequested: true },
      { setImpact, setCycleBaseline },
    );
    expect(setImpact).toHaveBeenCalledWith(null);
    expect(setCycleBaseline).toHaveBeenCalledWith("TOURNAMENT", "tour-1", null);
  });

  it("stores baseline on first worthy impact", () => {
    const setImpact = vi.fn();
    const setCycleBaseline = vi.fn();
    const changeSet = buildTourSet(tourSnap(), tourSnap({ startTime: "10:15" }))!;
    const payload = {
      collaboration: worthyImpact(changeSet),
      collaborationCycleBaseline: tournamentSnapshotToCycleBaseline(tourSnap()),
    };
    applyCollaborationMutationResponse(
      payload,
      { domain: "TOURNAMENT", activityId: "tour-1", cycleRequested: false },
      { setImpact, setCycleBaseline },
    );
    expect(extractCollaborationImpact(payload)).not.toBeNull();
    expect(setCycleBaseline).toHaveBeenCalled();
  });
});

describe("SCE-COLLAB-01B-R2 finalizeCollaborationMutationCycle", () => {
  it("returns initial baseline when worthy and no prior cycle", () => {
    const baseline = tournamentSnapshotToCycleBaseline(tourSnap());
    const changeSet = buildTourSet(tourSnap(), tourSnap({ startTime: "10:15" }))!;
    const result = finalizeCollaborationMutationCycle({
      cycleRequested: false,
      impact: worthyImpact(changeSet),
      cycleBaseline: null,
      initialCycleBaseline: baseline,
    });
    expect(result.cycleBaseline).toEqual(baseline);
    expect(result.impact?.worthy).toBe(true);
  });

  it("clears when cycle requested but zero net change", () => {
    const result = finalizeCollaborationMutationCycle({
      cycleRequested: true,
      impact: null,
      cycleBaseline: tournamentSnapshotToCycleBaseline(tourSnap()),
      initialCycleBaseline: tournamentSnapshotToCycleBaseline(tourSnap()),
    });
    expect(result.impact).toBeNull();
    expect(result.cycleBaseline).toBeNull();
  });
});
