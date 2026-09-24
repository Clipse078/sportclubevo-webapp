import { beforeEach, describe, expect, it, vi } from "vitest";
import { PersonAssignmentStatus } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findFirst: vi.fn() },
    person: { findFirst: vi.fn() },
    trainerTeamMember: { findMany: vi.fn() },
    playerSquadMember: { findMany: vi.fn() },
    personAssignment: { findMany: vi.fn() },
    orgUnitMembership: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/db/prisma";
import {
  getPersonallyRelevantTeamIds,
  isTeamPersonallyRelevant,
  permissionKeysArePersonalRelevance,
  pickPrimaryTeamRelationship,
  resolvePersonalContext,
} from "@/lib/dashboard/personal-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("DASHBOARD-01 — resolvePersonalContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenantMembership.findFirst).mockResolvedValue({ id: "tm-1" } as never);
    vi.mocked(prisma.orgUnitMembership.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.trainerTeamMember.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.personAssignment.findMany).mockResolvedValue([] as never);
  });

  it("returns empty relationships when user has no linked Person", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

    const ctx = await resolvePersonalContext({ tenantId: "tenant-a", userId: "user-a" });

    expect(ctx.personId).toBeNull();
    expect(ctx.hasLinkedPerson).toBe(false);
    expect(ctx.teams).toEqual([]);
    expect(getPersonallyRelevantTeamIds(ctx)).toEqual([]);
  });

  it("scopes Person lookup to tenant (cross-tenant Person excluded)", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue(null);

    await resolvePersonalContext({ tenantId: "tenant-b", userId: "user-a" });

    expect(prisma.person.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-b", userId: "user-a" },
      }),
    );
  });

  it("merges trainer and player relationships for the same team", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({ id: "person-1" } as never);
    vi.mocked(prisma.trainerTeamMember.findMany).mockResolvedValue([
      {
        teamSeason: {
          id: "ts-f2",
          teamId: "team-f2",
          team: { name: "F2", shortName: "F2" },
        },
      },
    ] as never);
    vi.mocked(prisma.playerSquadMember.findMany).mockResolvedValue([
      {
        teamSeason: {
          id: "ts-f2",
          teamId: "team-f2",
          team: { name: "F2", shortName: "F2" },
        },
      },
    ] as never);

    const ctx = await resolvePersonalContext({ tenantId: "tenant-a", userId: "user-a" });

    expect(ctx.teams).toHaveLength(1);
    expect(ctx.teams[0].kinds.sort()).toEqual(["PLAYER", "TRAINER"]);
    expect(ctx.teams[0].teamSeasonIds.sort()).toEqual(["ts-f2"]);
    expect(isTeamPersonallyRelevant(ctx, "team-f2")).toBe(true);
  });

  it("includes PersonAssignment team and org scopes", async () => {
    vi.mocked(prisma.person.findFirst).mockResolvedValue({ id: "person-1" } as never);
    vi.mocked(prisma.personAssignment.findMany).mockResolvedValue([
      {
        id: "asg-1",
        orgUnitId: "ou-board",
        teamId: "team-f2",
        functionKey: "VIZEPRAESIDENT",
        orgUnit: { id: "ou-board", name: "Vorstand" },
        team: { id: "team-f2", name: "F2", shortName: "F2" },
      },
    ] as never);

    const ctx = await resolvePersonalContext({ tenantId: "tenant-a", userId: "user-a" });

    expect(ctx.assignments).toHaveLength(1);
    expect(ctx.teams[0].kinds).toContain("PERSON_ASSIGNMENT");
    expect(ctx.orgUnits.some((o) => o.orgUnitId === "ou-board")).toBe(true);
    expect(prisma.personAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          status: PersonAssignmentStatus.ACTIVE,
        }),
      }),
    );
  });

  it("technical permissions do not expand personal relevance", () => {
    expect(
      permissionKeysArePersonalRelevance([
        PERMISSIONS.EVENTS_VIEW,
        PERMISSIONS.EVENTS_MANAGE,
        PERMISSIONS.USERS_MANAGE,
      ]),
    ).toBe(false);
  });
});

describe("DASHBOARD-01 — context labels", () => {
  it("prefers trainer label over assignment on same team", () => {
    const label = pickPrimaryTeamRelationship({
      teamId: "t1",
      teamName: "F2",
      kinds: ["PERSON_ASSIGNMENT", "TRAINER"],
      assignmentFunctionKeys: ["VIZEPRAESIDENT"],
      teamSeasonIds: [],
    });
    expect(label?.label).toBe("F2 · Trainer");
  });

  it("uses human function label for org assignment without exposing functionKey", () => {
    const label = pickPrimaryTeamRelationship({
      teamId: "t1",
      teamName: "F2",
      kinds: ["PERSON_ASSIGNMENT"],
      assignmentFunctionKeys: ["VIZEPRAESIDENT"],
      teamSeasonIds: [],
    });
    expect(label?.label).toContain("Vizepräsident");
    expect(label?.label).not.toContain("VIZEPRAESIDENT");
  });
});
