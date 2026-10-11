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

import { resolvePlayerReleaseAccess } from "../player-release-auth";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("resolvePlayerReleaseAccess", () => {
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

  it("allows source Stammtrainer to manage releases", async () => {
    mocks.trainerFindFirst.mockResolvedValue({ id: "ttm-1" });
    const access = await resolvePlayerReleaseAccess({
      userId: "user-1",
      tenantId: "tenant-a",
      tenantKey: "fca",
      teamId: "team-1",
      teamSeasonId: "ts-1",
    });
    expect(access?.canManageSource).toBe(true);
  });

  it("denies unrelated trainer without permissions", async () => {
    const access = await resolvePlayerReleaseAccess({
      userId: "user-2",
      tenantId: "tenant-a",
      tenantKey: "fca",
      teamId: "team-1",
      teamSeasonId: "ts-1",
    });
    expect(access).toBeNull();
  });

  it("allows teams.manage override", async () => {
    mocks.hasPermission.mockImplementation(({ permission }: { permission: string }) =>
      Promise.resolve(permission === PERMISSIONS.TEAMS_MANAGE),
    );
    const access = await resolvePlayerReleaseAccess({
      userId: "admin",
      tenantId: "tenant-a",
      tenantKey: "fca",
      teamId: "team-1",
      teamSeasonId: "ts-1",
    });
    expect(access?.canManageSource).toBe(true);
  });
});
