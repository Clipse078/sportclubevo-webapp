import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PersonalContext } from "@/lib/dashboard/personal-context";
import {
  assertPersonalProgrammeCalendarParity,
  collectPersonalProgrammeCalendarDayKeys,
} from "../personal-programme-universe";
import { groupPersonalProgrammeItemsByDay } from "../programme-day-key";
import type { PersonalProgrammeItem } from "../personal-programme-types";
import { getProgrammeSourcePresentation } from "../programme-source-presentation";
import { loadTeamEventProgrammeItems } from "../adapters/team-event-programme-adapter";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";

const TIME_ZONE = "Europe/Zurich";
const TEAM_A = "team-a";
const TEAM_B = "team-b";
const TS_A = "ts-a";

function buildContext(overrides: Partial<PersonalContext> = {}): PersonalContext {
  return {
    tenantId: "tenant-a",
    userId: "user-a",
    personId: "person-a",
    hasLinkedPerson: true,
    hasActiveTenantMembership: true,
    teams: [
      {
        teamId: TEAM_A,
        teamName: "Team A",
        kinds: ["TRAINER"],
        assignmentFunctionKeys: [],
        teamSeasonIds: [TS_A],
      },
    ],
    orgUnits: [],
    assignments: [],
    ...overrides,
  };
}

const adapterCtx = (ctx: PersonalContext, permissionKeys: string[] = [PERMISSIONS.EVENTS_VIEW]) => ({
  personal: ctx,
  permissionKeys,
  timeZone: TIME_ZONE,
  rangeStart: new Date("2026-09-01T00:00:00.000Z"),
  rangeEnd: new Date("2026-09-30T23:59:59.999Z"),
});

function eventRow(input: {
  id: string;
  teamId: string;
  teamSeasonId?: string | null;
  type?: "MATCH" | "TOURNAMENT" | "TRAINING" | "OTHER";
  title?: string;
  startAt?: Date;
}) {
  return {
    id: input.id,
    tenantId: "tenant-a",
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId ?? TS_A,
    type: input.type ?? "MATCH",
    status: "SCHEDULED",
    reviewStage: "PUBLISHED",
    title: input.title ?? "Fixture",
    startAt: input.startAt ?? new Date("2026-09-10T10:00:00.000Z"),
    endAt: null,
    allDay: false,
    opponentName: "Guest",
    homeAway: null,
    location: null,
    pitchCode: null,
    team: { name: input.teamId === TEAM_A ? "Team A" : "Team B" },
  };
}

describe("DASHBOARD-07R1B — personal calendar relevance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A — TEAM A trainer + TEAM A match → visible", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "m-a", teamId: TEAM_A, type: "MATCH" }),
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx(buildContext()));
    expect(items).toHaveLength(1);
    expect(items[0].sourceType).toBe("MATCH");
  });

  it("B — TEAM A trainer + TEAM B match → absent", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "m-b", teamId: TEAM_B, teamSeasonId: "ts-b", type: "MATCH" }),
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx(buildContext()));
    expect(items).toEqual([]);
    expect(JSON.stringify(items)).not.toContain("m-b");
  });

  it("C — TEAM A trainer + TEAM A tournament → visible", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "t-a", teamId: TEAM_A, type: "TOURNAMENT", title: "Cup" }),
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx(buildContext()));
    expect(items[0]?.sourceType).toBe("TOURNAMENT");
  });

  it("D — TEAM A trainer + TEAM B tournament → absent", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "t-b", teamId: TEAM_B, teamSeasonId: "ts-b", type: "TOURNAMENT" }),
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx(buildContext()));
    expect(items).toEqual([]);
  });

  it("E — Club Admin permissions without team relationship → absent", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "m-b", teamId: TEAM_B, teamSeasonId: "ts-b" }),
    ] as never);

    const items = await loadTeamEventProgrammeItems(
      adapterCtx(buildContext({ teams: [], hasLinkedPerson: false, personId: null }), [
        PERMISSIONS.USERS_MANAGE,
        PERMISSIONS.EVENTS_VIEW,
        PERMISSIONS.EVENTS_MANAGE,
      ]),
    );
    expect(items).toEqual([]);
    expect(prisma.event.findMany).not.toHaveBeenCalled();
  });

  it("F — MATCHES_VIEW / EVENTS_VIEW without relationship → absent", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "m-b", teamId: TEAM_B, teamSeasonId: "ts-b" }),
    ] as never);

    const items = await loadTeamEventProgrammeItems(
      adapterCtx(buildContext({ teams: [] }), [PERMISSIONS.EVENTS_VIEW]),
    );
    expect(items).toEqual([]);
  });

  it("G — TOURNAMENTS_VIEW without relationship → absent", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "t-b", teamId: TEAM_B, teamSeasonId: "ts-b", type: "TOURNAMENT" }),
    ] as never);

    const items = await loadTeamEventProgrammeItems(
      adapterCtx(buildContext({ teams: [] }), [PERMISSIONS.TOURNAMENTS_VIEW, PERMISSIONS.EVENTS_VIEW]),
    );
    expect(items).toEqual([]);
  });

  it("H — multi-team additive relationships → both teams visible", async () => {
    const ctx = buildContext({
      teams: [
        {
          teamId: TEAM_A,
          teamName: "Team A",
          kinds: ["TRAINER"],
          assignmentFunctionKeys: [],
          teamSeasonIds: [TS_A],
        },
        {
          teamId: TEAM_B,
          teamName: "Team B",
          kinds: ["TRAINER"],
          assignmentFunctionKeys: [],
          teamSeasonIds: ["ts-b"],
        },
      ],
    });

    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "m-a", teamId: TEAM_A }),
      eventRow({ id: "m-b", teamId: TEAM_B, teamSeasonId: "ts-b" }),
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx(ctx));
    expect(items.map((i) => i.id).sort()).toEqual(["event:m-a", "event:m-b"]);
  });

  it("I — removed relationship → event disappears", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "m-b", teamId: TEAM_B, teamSeasonId: "ts-b" }),
    ] as never);

    const without = await loadTeamEventProgrammeItems(adapterCtx(buildContext()));
    expect(without).toEqual([]);
  });

  it("J — cross-tenant event row → absent", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        ...eventRow({ id: "x", teamId: TEAM_A }),
        tenantId: "tenant-other",
      },
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx(buildContext()));
    expect(items).toEqual([]);
  });

  it("K — relevant team but unauthorized review stage → absent", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        ...eventRow({ id: "draft", teamId: TEAM_A }),
        reviewStage: "DRAFT",
        title: "SECRET",
      },
    ] as never);

    const items = await loadTeamEventProgrammeItems(
      adapterCtx(buildContext(), [PERMISSIONS.EVENTS_VIEW]),
    );
    expect(items).toEqual([]);
    expect(JSON.stringify(items)).not.toContain("SECRET");
  });

  it("L — authorized unrelated team event in candidate set → absent after relevance gate", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      eventRow({ id: "m-b", teamId: TEAM_B, teamSeasonId: "ts-b" }),
    ] as never);

    const items = await loadTeamEventProgrammeItems(
      adapterCtx(buildContext(), [PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE]),
    );
    expect(items).toEqual([]);
  });

  it("programme/calendar parity — calendar day keys ⊆ programme universe", () => {
    const blitz: PersonalProgrammeItem = {
      id: "event:blitz",
      sourceType: "TOURNAMENT",
      startsAt: new Date("2026-09-27T07:30:00.000Z"),
      title: "Blitzturnier",
      deepLink: "/dashboard/planner/edit/blitz",
      typeLabel: "Turnier",
      ariaLabel: "Turnier: Blitzturnier",
    };
    const programmeItems = [blitz];
    const calendarItems = [blitz];

    assertPersonalProgrammeCalendarParity({
      programmeItems,
      calendarItems,
      timeZone: TIME_ZONE,
    });

    const days = collectPersonalProgrammeCalendarDayKeys(programmeItems, TIME_ZONE);
    expect(days.has("2026-09-27")).toBe(true);
    expect((groupPersonalProgrammeItemsByDay(calendarItems, TIME_ZONE).get("2026-09-27") ?? []).length).toBe(1);
  });

  it("Sep 27 Blitzturnier remains orange (TOURNAMENT palette)", () => {
    const palette = getProgrammeSourcePresentation("TOURNAMENT").paletteKey;
    expect(palette).toBe("tournament-orange");
  });
});
