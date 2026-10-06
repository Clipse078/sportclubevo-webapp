import { describe, expect, it } from "vitest";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import type { WeekplannerMatchItem, WeekplannerTrainingItem } from "@/lib/weekplanner/types";
import {
  activityEffectiveTimesOverlap,
  canOfferSameTeamTrainingCancellation,
  resolveSameTeamTrainingCancellationOffer,
  sameCanonicalTeamSeasonId,
} from "../same-team-training-cancellation";

const PITCH = {
  facilityResourceId: "p1",
  facilityId: "f1",
  code: "A",
  name: "Hauptfeld A",
  facilityName: "Anlage",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const TS_30 = "ts-senioren-30-fca";
const TS_40 = "ts-senioren-40-fca";

function baseFields(start: Date, end: Date) {
  return {
    tenantId: "t1",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [] as WeekplannerTrainingItem["conflicts"],
    dressingRoomOccupancyMode: "DEFAULT" as const,
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
  };
}

function training(id: string, teamSeasonId: string, start: Date, end: Date): WeekplannerTrainingItem {
  return {
    ...baseFields(start, end),
    id,
    type: "TRAINING",
    title: "Training",
    teamNames: ["Senioren 30+"],
    trainingSeriesId: "series-1",
    trainingSessionId: `sess-${id}`,
    teamSeasonId,
  };
}

function match(
  id: string,
  teamSeasonId: string | null,
  start: Date,
  end: Date,
  title: string,
): WeekplannerMatchItem {
  return {
    ...baseFields(start, end),
    id,
    type: "MATCH",
    title,
    teamNames: ["Senioren 30+"],
    teamSeasonId,
    eventId: `ev-${id}`,
    eventSource: teamSeasonId ? "SFV" : "MANUAL",
    opponentName: "FC Dardania",
    homeAway: "HOME",
    homeSide: { displayName: "Senioren 30+", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "FC Dardania", logoUrl: null, isOwnTeam: false },
    awayDressingRoomAllocations: [],
  };
}

describe("SCE-PLANNER-UX-08-07R3 — same-team training cancellation offer", () => {
  const start = new Date("2026-10-07T18:15:00.000Z");
  const trainEnd = new Date("2026-10-07T19:45:00.000Z");
  const matchEnd = new Date("2026-10-07T20:15:00.000Z");

  it("A — same TeamSeason TRAINING/MATCH overlap yields offer from training focal item", () => {
    const t = training("training:30", TS_30, start, trainEnd);
    const m = match("match:30", TS_30, start, matchEnd, "Senioren 30+ vs FC Dardania");
    const [tAnn, mAnn] = annotateWeekplannerConflicts([t, m]);
    const itemsById = new Map([
      [tAnn.id, tAnn],
      [mAnn.id, mAnn],
    ]);
    const conflict = tAnn.conflicts[0]!;
    const offer = resolveSameTeamTrainingCancellationOffer(tAnn, conflict, itemsById);
    expect(offer).not.toBeNull();
    expect(offer!.training.trainingSessionId).toBe("sess-training:30");
    expect(offer!.match.id).toBe(mAnn.id);
    expect(canOfferSameTeamTrainingCancellation(offer!, { canManageTrainings: true, canManageEvents: false, canManageAllocations: false })).toBe(true);
  });

  it("B — different TeamSeason ids do not offer shortcut", () => {
    const t = training("training:40", TS_40, start, trainEnd);
    const m = match("match:30", TS_30, start, matchEnd, "Senioren 30+ vs FC Dardania");
    const [tAnn] = annotateWeekplannerConflicts([t, m]);
    const itemsById = new Map([[tAnn.id, tAnn], [m.id, m]]);
    const conflict = tAnn.conflicts[0]!;
    expect(resolveSameTeamTrainingCancellationOffer(tAnn, conflict, itemsById)).toBeNull();
    expect(sameCanonicalTeamSeasonId(t, m)).toBe(false);
  });

  it("C — provider-style match with resolved TeamSeason id still matches training", () => {
    const t = training("training:30", TS_30, start, trainEnd);
    const m = match("match:sfv", TS_30, start, matchEnd, "Senioren 30+ vs FC Dardania");
    expect(m.eventSource).toBe("SFV");
    expect(sameCanonicalTeamSeasonId(t, m)).toBe(true);
  });

  it("D — unauthorized actor cannot offer cancellation", () => {
    const t = training("training:30", TS_30, start, trainEnd);
    const m = match("match:30", TS_30, start, matchEnd, "Senioren 30+ vs FC Dardania");
    const offer = { training: t, match: m };
    expect(
      canOfferSameTeamTrainingCancellation(offer, {
        canManageTrainings: false,
        canManageEvents: true,
        canManageAllocations: true,
      }),
    ).toBe(false);
  });

  it("requires effective activity time overlap", () => {
    const t = training("training:30", TS_30, start, trainEnd);
    const m = match(
      "match:30",
      TS_30,
      new Date("2026-10-07T22:00:00.000Z"),
      new Date("2026-10-07T23:00:00.000Z"),
      "Senioren 30+ vs FC Dardania",
    );
    expect(activityEffectiveTimesOverlap(t, m)).toBe(false);
    const [tAnn] = annotateWeekplannerConflicts([t, m]);
    if (tAnn.conflicts.length === 0) {
      expect(resolveSameTeamTrainingCancellationOffer(tAnn, { facilityResourceId: PITCH.facilityResourceId, facilityResourceName: PITCH.name, partnerItemId: m.id }, new Map([[tAnn.id, tAnn], [m.id, m]]))).toBeNull();
    }
  });

  it("G — offer resolves when focal item is the MATCH", () => {
    const t = training("training:30", TS_30, start, trainEnd);
    const m = match("match:30", TS_30, start, matchEnd, "Senioren 30+ vs FC Dardania");
    const [, mAnn] = annotateWeekplannerConflicts([t, m]);
    const itemsById = new Map([
      [t.id, t],
      [mAnn.id, mAnn],
    ]);
    const conflict = mAnn.conflicts[0]!;
    const offer = resolveSameTeamTrainingCancellationOffer(mAnn, conflict, itemsById);
    expect(offer?.training.id).toBe(t.id);
  });
});
