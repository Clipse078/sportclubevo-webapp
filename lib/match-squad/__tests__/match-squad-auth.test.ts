import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  teamFindFirst: vi.fn(),
  teamSeasonFindFirst: vi.fn(),
  trainerFindFirst: vi.fn(),
  hasPermission: vi.fn(),
  isSuperAdmin: vi.fn(),
  isClubAdmin: vi.fn(),
  resolvePersonId: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    team: { findFirst: mocks.teamFindFirst },
    teamSeason: { findFirst: mocks.teamSeasonFindFirst },
    trainerTeamMember: { findFirst: mocks.trainerFindFirst },
  },
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: () => ({
    hasPermission: mocks.hasPermission,
  }),
}));

vi.mock("@/lib/teams/team-document-auth", () => ({
  isPlatformSuperAdmin: mocks.isSuperAdmin,
  isTenantClubAdmin: mocks.isClubAdmin,
  resolvePersonIdForUser: mocks.resolvePersonId,
}));

import { resolveMatchSquadAccess } from "../auth";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("resolveMatchSquadAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.teamFindFirst.mockResolvedValue({ id: "team-1" });
    mocks.teamSeasonFindFirst.mockResolvedValue({ id: "ts-1" });
    mocks.isSuperAdmin.mockResolvedValue(false);
    mocks.isClubAdmin.mockResolvedValue(false);
    mocks.resolvePersonId.mockResolvedValue("person-trainer");
    mocks.hasPermission.mockResolvedValue(false);
    mocks.trainerFindFirst.mockResolvedValue(null);
  });

  it("allows active trainer on same TeamSeason to edit", async () => {
    mocks.trainerFindFirst.mockResolvedValue({ id: "ttm-1" });
    mocks.hasPermission.mockImplementation(({ permission }: { permission: string }) =>
      Promise.resolve(permission === PERMISSIONS.EVENTS_VIEW),
    );

    const access = await resolveMatchSquadAccess({
      userId: "user-1",
      tenantId: "tenant-a",
      tenantKey: "fca",
      teamId: "team-1",
      teamSeasonId: "ts-1",
    });

    expect(access?.canEdit).toBe(true);
    expect(access?.canView).toBe(true);
  });

  it("denies unrelated user without permissions", async () => {
    const access = await resolveMatchSquadAccess({
      userId: "user-2",
      tenantId: "tenant-a",
      tenantKey: "fca",
      teamId: "team-1",
      teamSeasonId: "ts-1",
    });
    expect(access).toBeNull();
  });

  it("allows events.manage coordinator", async () => {
    mocks.hasPermission.mockImplementation(({ permission }: { permission: string }) =>
      Promise.resolve(permission === PERMISSIONS.EVENTS_MANAGE),
    );
    const access = await resolveMatchSquadAccess({
      userId: "coord",
      tenantId: "tenant-a",
      tenantKey: "fca",
      teamId: "team-1",
      teamSeasonId: "ts-1",
    });
    expect(access?.canEdit).toBe(true);
  });
});
