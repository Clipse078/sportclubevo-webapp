import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PersonalContext } from "@/lib/dashboard/personal-context";
import { loadTeamEventProgrammeItems } from "../adapters/team-event-programme-adapter";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";

const TIME_ZONE = "Europe/Zurich";
const F2_TEAM = "team-f2";
const F2_TS = "ts-f2-2026";
const S40_TEAM = "team-s40";
const S40_TS = "ts-s40-2026";

/** STAGE-like actor: F2 TRAINER assignment + Senioren 40+ SPIELER assignment, no squad rows. */
function buildStageLikeContext(): PersonalContext {
  return {
    tenantId: "tenant-fca",
    userId: "user-fca",
    personId: "person-fca",
    hasLinkedPerson: true,
    hasActiveTenantMembership: true,
    teams: [
      {
        teamId: F2_TEAM,
        teamName: "Junioren F2",
        kinds: ["PERSON_ASSIGNMENT", "TRAINER"],
        assignmentFunctionKeys: ["TRAINER"],
        teamSeasonIds: [F2_TS],
      },
      {
        teamId: S40_TEAM,
        teamName: "Senioren 40+",
        kinds: ["PERSON_ASSIGNMENT", "PLAYER"],
        assignmentFunctionKeys: ["SPIELER"],
        teamSeasonIds: [S40_TS],
      },
    ],
    orgUnits: [],
    assignments: [],
  };
}

const adapterCtx = (ctx: PersonalContext) => ({
  personal: ctx,
  permissionKeys: [PERMISSIONS.EVENTS_VIEW],
  timeZone: TIME_ZONE,
  rangeStart: new Date("2026-09-01T00:00:00.000Z"),
  rangeEnd: new Date("2026-09-30T23:59:59.999Z"),
});

describe("DASHBOARD-07R1C — STAGE root-cause regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SFV match with null teamSeasonId for season-scoped SPIELER assignment → absent", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "sfv-match",
        tenantId: "tenant-fca",
        teamId: S40_TEAM,
        teamSeasonId: null,
        type: "MATCH",
        status: "SCHEDULED",
        reviewStage: "PUBLISHED",
        title: "Senioren 40+ – Opponent",
        startAt: new Date("2026-09-04T14:00:00.000Z"),
        endAt: null,
        allDay: false,
        opponentName: "Opponent",
        homeAway: "HOME",
        location: null,
        pitchCode: null,
        team: { name: "Senioren 40+" },
      },
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx(buildStageLikeContext()));

    expect(items).toEqual([]);
    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teamSeasonId: { in: [F2_TS, S40_TS] },
        }),
      }),
    );
  });

  it("F2 tournament with aligned teamSeasonId → visible (Sep 27 Blitzturnier class)", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([
      {
        id: "blitz",
        tenantId: "tenant-fca",
        teamId: F2_TEAM,
        teamSeasonId: F2_TS,
        type: "TOURNAMENT",
        status: "SCHEDULED",
        reviewStage: "PUBLISHED",
        title: "Blitzturnier",
        startAt: new Date("2026-09-27T07:30:00.000Z"),
        endAt: null,
        allDay: false,
        opponentName: null,
        homeAway: null,
        location: null,
        pitchCode: null,
        team: { name: "Junioren F2" },
      },
    ] as never);

    const items = await loadTeamEventProgrammeItems(adapterCtx(buildStageLikeContext()));
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Blitzturnier");
    expect(items[0]?.sourceType).toBe("TOURNAMENT");
  });

  it("does not query teamId-only scope when teamSeasonIds are resolved", async () => {
    vi.mocked(prisma.event.findMany).mockResolvedValue([] as never);
    await loadTeamEventProgrammeItems(adapterCtx(buildStageLikeContext()));
    const where = vi.mocked(prisma.event.findMany).mock.calls[0]?.[0]?.where as Record<string, unknown>;
    expect(where.teamSeasonId).toEqual({ in: [F2_TS, S40_TS] });
    expect(where).not.toHaveProperty("OR");
  });
});
