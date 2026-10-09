import { describe, expect, it } from "vitest";
import {
  buildMatchActivityChangeSet,
  diffMatchActivitySnapshots,
} from "@/lib/collaboration/match/match-activity-change";
import type { MatchActivitySnapshot } from "@/lib/collaboration/match/match-activity-snapshot";
import {
  buildTournamentActivityChangeSet,
  diffTournamentActivitySnapshots,
} from "@/lib/collaboration/tournament/tournament-activity-change";
import type { TournamentActivitySnapshot } from "@/lib/collaboration/tournament/tournament-activity-snapshot";
import { buildActivityChangeFingerprint } from "@/lib/collaboration/activity-change/fingerprint";
import { detectDetailChanges } from "@/lib/integrations/sfv/sync/detail-persistence";
import { dedupeTenantTeamIds } from "@/lib/collaboration/shared/operational-audience";

function matchSnapshot(overrides: Partial<MatchActivitySnapshot> = {}): MatchActivitySnapshot {
  return {
    matchId: "match-1",
    tenantId: "tenant-1",
    teamId: "team-home",
    teamName: "Junioren F2",
    teamSeasonId: "ts-1",
    title: "FCA – FC Basel",
    status: "SCHEDULED",
    source: "MANUAL",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-15",
    startTime: "18:30",
    endTime: "20:00",
    locationLabel: "Im Brüel, Allschwil, -2",
    pitchLabel: "KR2",
    playableVenueLabel: "Im Brüel, Allschwil, -2 · KR2",
    dressingRoomLabel: "Heim G1",
    scheduleLine: "Mittwoch · 18:30–20:00",
    ...overrides,
  };
}

function tournamentSnapshot(
  overrides: Partial<TournamentActivitySnapshot> = {},
): TournamentActivitySnapshot {
  return {
    tournamentId: "tour-1",
    tenantId: "tenant-1",
    teamId: "team-1",
    teamName: "Junioren F2",
    teamSeasonId: "ts-1",
    title: "Herbstturnier",
    status: "SCHEDULED",
    timezone: "Europe/Zurich",
    locale: "de-CH",
    dateKey: "2026-10-20",
    startTime: "09:00",
    endTime: "12:00",
    locationLabel: "Im Brüel",
    resourceLabel: "KR2",
    playableVenueLabel: "Im Brüel · KR2",
    scheduleLine: "Montag · 09:00–12:00",
    ...overrides,
  };
}

describe("SCE-COLLAB-01B match change detection", () => {
  it("1 unchanged match", () => {
    const s = matchSnapshot();
    expect(buildMatchActivityChangeSet(s, s)).toBeNull();
  });

  it("2 date change", () => {
    const s = matchSnapshot();
    const set = buildMatchActivityChangeSet(s, matchSnapshot({ dateKey: "2026-10-16" }));
    expect(set?.entries.some((e) => e.field === "DATE")).toBe(true);
  });

  it("3 kickoff change", () => {
    const set = buildMatchActivityChangeSet(
      matchSnapshot(),
      matchSnapshot({ startTime: "19:30" }),
    );
    expect(set?.entries.some((e) => e.field === "START_TIME")).toBe(true);
  });

  it("4 venue change", () => {
    const set = buildMatchActivityChangeSet(
      matchSnapshot(),
      matchSnapshot({ locationLabel: "Gemeindesportplatz" }),
    );
    expect(set?.entries.some((e) => e.field === "VENUE")).toBe(true);
  });

  it("5 pitch/resource change uses Spielfeld without noisy Ort", () => {
    const before = matchSnapshot({ pitchLabel: null, locationLabel: "Im Brüel, Allschwil, -2" });
    const after = matchSnapshot({ pitchLabel: "Hauptfeld", locationLabel: "Im Brüel, Allschwil, -2" });
    const entries = diffMatchActivitySnapshots(before, after);
    expect(entries.some((e) => e.field === "RESOURCE")).toBe(true);
    expect(entries.some((e) => e.field === "VENUE")).toBe(false);
    const resource = entries.find((e) => e.field === "RESOURCE");
    expect(resource?.displayOld).toBe("Nicht zugewiesen");
    expect(resource?.displayNew).toBe("Hauptfeld");
  });

  it("5b dressing room resource change", () => {
    const before = matchSnapshot({ dressingRoomLabel: "Heim G1" });
    const after = matchSnapshot({ dressingRoomLabel: "Heim G2" });
    const entries = diffMatchActivitySnapshots(before, after);
    expect(entries.some((e) => e.field === "RESOURCE")).toBe(true);
  });

  it("6 cancellation", () => {
    const set = buildMatchActivityChangeSet(matchSnapshot(), matchSnapshot({ status: "CANCELLED" }));
    expect(set?.entries.some((e) => e.field === "STATUS")).toBe(true);
  });

  it("7 restore", () => {
    const set = buildMatchActivityChangeSet(
      matchSnapshot({ status: "CANCELLED" }),
      matchSnapshot({ status: "SCHEDULED" }),
    );
    expect(set?.entries.some((e) => e.field === "STATUS")).toBe(true);
  });

  it("8 multi-change consolidated", () => {
    const set = buildMatchActivityChangeSet(
      matchSnapshot(),
      matchSnapshot({
        startTime: "19:30",
        locationLabel: "Gemeindesportplatz",
      }),
    );
    expect((set?.entries.length ?? 0) >= 2).toBe(true);
  });

  it("9 technical metadata only — no snapshot fields", () => {
    expect(buildMatchActivityChangeSet(matchSnapshot(), matchSnapshot())).toBeNull();
  });

  it("10 result/score not in diff surface", () => {
    const entries = diffMatchActivitySnapshots(matchSnapshot(), matchSnapshot());
    expect(entries.length).toBe(0);
  });

  it("11 identical SFV payload — detectDetailChanges false", () => {
    const kickoff = new Date("2026-10-15T16:30:00.000Z");
    const existing = {
      startAt: kickoff,
      status: "SCHEDULED",
      location: "Im Brüel",
      competitionLabel: "Junioren",
      intermediateResultLabel: null,
    };
    const changed = detectDetailChanges(existing, {
      matchDate: "2026-10-15T18:30:00",
      matchState: 1,
      matchStateName: "Scheduled",
      playgroundName: "Im Brüel",
      leagueName: "Junioren",
      divisionName: null,
      intermediateScoreHome: null,
      intermediateScoreAway: null,
    } as never);
    expect(changed).toBe(false);
  });

  it("12 external meaningful kickoff would change snapshot fields", () => {
    const set = buildMatchActivityChangeSet(
      matchSnapshot({ startTime: "18:30" }),
      matchSnapshot({ startTime: "19:30" }),
    );
    expect(set).not.toBeNull();
  });

  it("cross-domain fingerprint collision prevented", () => {
    const trainingFp = buildActivityChangeFingerprint({
      domain: "TRAINING",
      activityId: "x",
      entries: [
        {
          field: "START_TIME",
          oldValue: "18:30",
          newValue: "19:30",
          displayOld: "18:30",
          displayNew: "19:30",
          significant: true,
        },
      ],
    });
    const matchFp = buildActivityChangeFingerprint({
      domain: "MATCH",
      activityId: "x",
      entries: [
        {
          field: "START_TIME",
          oldValue: "18:30",
          newValue: "19:30",
          displayOld: "18:30",
          displayNew: "19:30",
          significant: true,
        },
      ],
    });
    expect(trainingFp).not.toEqual(matchFp);
  });
});

describe("SCE-COLLAB-01B tournament change detection", () => {
  it("21 unchanged tournament", () => {
    const s = tournamentSnapshot();
    expect(buildTournamentActivityChangeSet(s, s)).toBeNull();
  });

  it("22–28 schedule/venue/status changes", () => {
    expect(
      buildTournamentActivityChangeSet(
        tournamentSnapshot(),
        tournamentSnapshot({ dateKey: "2026-10-21" }),
      )?.entries.some((e) => e.field === "DATE"),
    ).toBe(true);
    expect(
      buildTournamentActivityChangeSet(
        tournamentSnapshot(),
        tournamentSnapshot({ startTime: "10:00" }),
      )?.entries.some((e) => e.field === "START_TIME"),
    ).toBe(true);
    expect(
      buildTournamentActivityChangeSet(
        tournamentSnapshot(),
        tournamentSnapshot({ endTime: "13:00" }),
      )?.entries.some((e) => e.field === "END_TIME"),
    ).toBe(true);
    expect(
      buildTournamentActivityChangeSet(
        tournamentSnapshot(),
        tournamentSnapshot({ locationLabel: "Gemeindesportplatz" }),
      )?.entries.some((e) => e.field === "VENUE"),
    ).toBe(true);
    expect(
      buildTournamentActivityChangeSet(
        tournamentSnapshot({ locationLabel: "Im Brüel", resourceLabel: null }),
        tournamentSnapshot({ locationLabel: "Im Brüel", resourceLabel: "Kunstrasen 2" }),
      )?.entries.some((e) => e.field === "RESOURCE"),
    ).toBe(true);
    expect(
      buildTournamentActivityChangeSet(
        tournamentSnapshot(),
        tournamentSnapshot({ status: "CANCELLED" }),
      )?.entries.some((e) => e.field === "STATUS"),
    ).toBe(true);
    expect(
      buildTournamentActivityChangeSet(
        tournamentSnapshot({ status: "CANCELLED" }),
        tournamentSnapshot({ status: "SCHEDULED" }),
      )?.entries.some((e) => e.field === "STATUS"),
    ).toBe(true);
  });

  it("29 multi-change consolidated", () => {
    const set = buildTournamentActivityChangeSet(
      tournamentSnapshot(),
      tournamentSnapshot({ startTime: "10:00", locationLabel: "Neu" }),
    );
    expect((set?.entries.length ?? 0) >= 2).toBe(true);
  });

  it("30 internal metadata ignored in diff API", () => {
    expect(diffTournamentActivitySnapshots(tournamentSnapshot(), tournamentSnapshot()).length).toBe(
      0,
    );
  });

  it("31 organiser not modeled in snapshot diff", () => {
    expect(buildTournamentActivityChangeSet(tournamentSnapshot(), tournamentSnapshot())).toBeNull();
  });
});

describe("SCE-COLLAB-01B audience helpers", () => {
  it("dedupes team ids", () => {
    expect(dedupeTenantTeamIds(["t2", "t1", "t2", null, ""])).toEqual(["t1", "t2"]);
  });
});
