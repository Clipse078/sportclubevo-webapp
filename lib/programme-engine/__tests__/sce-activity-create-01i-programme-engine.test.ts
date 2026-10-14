import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  applyProgrammeFilters,
  buildProgrammeItemId,
  buildProgrammeResourceKey,
  isClubEventRelevantToTeamProgrammeContext,
  resolveProgrammeRange,
  sortProgrammeItems,
} from "@/lib/programme-engine";
import { parseProgrammeUrlState, buildProgrammeHref, programmeFiltersFromUrlState } from "@/lib/programme-engine/programme-url";
import type { ProgrammeItem } from "@/lib/programme-engine/types";

const mocks = vi.hoisted(() => ({
  listTrainingSessions: vi.fn(),
  listMatchcenterMatches: vi.fn(),
  listTournaments: vi.fn(),
  eventFindMany: vi.fn(),
  teamSeasonFindMany: vi.fn(),
  teamFindMany: vi.fn(),
}));

vi.mock("@/lib/training/session-generation-service", () => ({
  listTrainingSessions: mocks.listTrainingSessions,
}));

vi.mock("@/lib/matchcenter/query-service", () => ({
  listMatchcenterMatches: mocks.listMatchcenterMatches,
}));

vi.mock("@/lib/tournaments/tournament-service", () => ({
  listTournaments: mocks.listTournaments,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: mocks.eventFindMany },
    teamSeason: { findMany: mocks.teamSeasonFindMany },
    team: { findMany: mocks.teamFindMany },
  },
}));

vi.mock("@/lib/sporting-activity-presentation/training-facility-batch", () => ({
  loadTrainingSessionFacilityHints: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/facilities/display-helpers", () => ({
  batchGetEventAllocationDisplayForTenant: vi.fn(async () => []),
}));

import { queryProgramme } from "@/lib/programme-engine/query-programme";

function sampleItem(overrides: Partial<ProgrammeItem> & Pick<ProgrammeItem, "id" | "kind">): ProgrammeItem {
  const domainId = overrides.domainId ?? "dom-1";
  return {
    id: overrides.id,
    kind: overrides.kind,
    domainId,
    resourceKey: buildProgrammeResourceKey(overrides.kind, domainId),
    startsAt: overrides.startsAt ?? new Date("2026-10-15T18:00:00.000Z"),
    endsAt: overrides.endsAt ?? null,
    allDay: false,
    presentation: {
      kind: overrides.kind === "CLUB_EVENT" ? "CLUB_EVENT" : overrides.kind,
      activityId: domainId,
      resourceKey: buildProgrammeResourceKey(overrides.kind, domainId),
      typeLabel: overrides.kind,
    } as ProgrammeItem["presentation"],
    teamId: overrides.teamId ?? "team-1",
    teamSeasonId: overrides.teamSeasonId ?? "ts-1",
    orgUnitId: overrides.orgUnitId ?? "ou-1",
    status: overrides.status ?? "scheduled",
    navigationTarget: `/dashboard/activity/event/${domainId}`,
    ...overrides,
  };
}

describe("SCE-ACTIVITY-CREATE-01I — Programme Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listTrainingSessions.mockResolvedValue([]);
    mocks.listMatchcenterMatches.mockResolvedValue([]);
    mocks.listTournaments.mockResolvedValue([]);
    mocks.eventFindMany.mockResolvedValue([]);
    mocks.teamSeasonFindMany.mockResolvedValue([]);
    mocks.teamFindMany.mockResolvedValue([]);
  });

  it("buildProgrammeItemId is stable and deterministic", () => {
    expect(buildProgrammeItemId("MATCH", "e1")).toBe("MATCH:e1");
    expect(buildProgrammeResourceKey("TRAINING", "s1")).toBe("training-session:s1");
  });

  it("resolveProgrammeRange defaults to upcoming bounded window", () => {
    const range = resolveProgrammeRange({ timeZone: "Europe/Zurich" });
    expect(range.rangeEnd.getTime()).toBeGreaterThan(range.rangeStart.getTime());
  });

  it("sortProgrammeItems orders by start time then id", () => {
    const items = sortProgrammeItems([
      sampleItem({ id: "MATCH:b", kind: "MATCH", startsAt: new Date("2026-10-16T10:00:00.000Z") }),
      sampleItem({ id: "TRAINING:a", kind: "TRAINING", startsAt: new Date("2026-10-15T10:00:00.000Z") }),
    ]);
    expect(items[0]?.id).toBe("TRAINING:a");
  });

  it("applyProgrammeFilters supports team and activity kind multi-select", () => {
    const items = [
      sampleItem({ id: "TRAINING:1", kind: "TRAINING", teamId: "t1" }),
      sampleItem({ id: "MATCH:1", kind: "MATCH", teamId: "t2" }),
    ];
    const filtered = applyProgrammeFilters(items, {
      teamIds: ["t1"],
      activityKinds: ["TRAINING"],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.kind).toBe("TRAINING");
  });

  it("club event team relevance uses audience architecture (exact org unit)", () => {
    expect(
      isClubEventRelevantToTeamProgrammeContext(
        { scope: "CLUB_WIDE", teamIds: [], orgUnitIds: [] },
        { teamId: "t1", orgUnitId: "ou-1" },
      ),
    ).toBe(true);

    expect(
      isClubEventRelevantToTeamProgrammeContext(
        { scope: "SELECTED_ORG_UNITS", teamIds: [], orgUnitIds: ["ou-2"] },
        { teamId: "t1", orgUnitId: "ou-1" },
      ),
    ).toBe(false);

    expect(
      isClubEventRelevantToTeamProgrammeContext(
        { scope: "SELECTED_ORG_UNITS", teamIds: [], orgUnitIds: ["ou-1"] },
        { teamId: "t1", orgUnitId: "ou-1" },
      ),
    ).toBe(true);
  });

  it("parseProgrammeUrlState preserves liste/kalender and filters", () => {
    const state = parseProgrammeUrlState({
      ansicht: "kalender",
      zeitraum: "vergangen",
      teams: "t1,t2",
      org: "ou1",
      typ: "TRAINING,MATCH",
    });
    expect(state.view).toBe("kalender");
    expect(state.temporal).toBe("past");
    expect(state.teamIds).toEqual(["t1", "t2"]);
    expect(programmeFiltersFromUrlState(state).activityKinds).toEqual(["TRAINING", "MATCH"]);
  });

  it("buildProgrammeHref round-trips meaningful filter params", () => {
    const href = buildProgrammeHref(
      "/dashboard/programm",
      parseProgrammeUrlState({}),
      { view: "kalender", teamIds: ["t1"], temporal: "past" },
    );
    expect(href).toContain("ansicht=kalender");
    expect(href).toContain("teams=t1");
    expect(href).toContain("zeitraum=vergangen");
  });

  it("queryProgramme TEAM scope aggregates loaders (mocked)", async () => {
    mocks.listMatchcenterMatches.mockResolvedValue([
      {
        id: "m1",
        tenantId: "tenant-1",
        teamId: "team-1",
        teamSeasonId: "ts-1",
        type: "MATCH",
        status: "SCHEDULED",
        reviewStage: "PUBLISHED",
        startAt: new Date("2026-10-20T15:00:00.000Z"),
        endAt: null,
        allDay: false,
        homeAway: "HOME",
        home: { displayName: "FCA", logoUrl: null },
        away: { displayName: "Guest", logoUrl: null },
        location: null,
        operational: { pitchCode: null },
        visibility: {
          websiteVisible: true,
          infoboardVisible: true,
          teamPageVisible: true,
          wochenplanVisible: true,
        },
      },
    ]);

    const result = await queryProgramme({
      tenantId: "tenant-1",
      timeZone: "Europe/Zurich",
      userId: "user-1",
      permissionKeys: ["events.view", "trainings.view"],
      scope: { kind: "TEAM", teamId: "team-1", teamSeasonId: "ts-1", orgUnitId: "ou-1" },
    });

    expect(result.scope.kind).toBe("TEAM");
    expect(result.items.some((i) => i.kind === "MATCH")).toBe(true);
  });
});
