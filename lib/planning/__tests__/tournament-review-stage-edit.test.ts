/**
 * TURNIERE-UX-01B — tournaments must not lock scoped editors by reviewStage.
 */

import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PlanningAuthorizationPolicy } from "../planning-authorization-policy";

const ACTIVE_MEMBERSHIP = {
  isActive: true,
  user: { isActive: true },
  tenant: { status: "ACTIVE" },
};

function scopedTournamentPrisma(): PrismaClient {
  return {
    tenantMembership: {
      findUnique: vi.fn().mockResolvedValue(ACTIVE_MEMBERSHIP),
    },
    userRole: {
      findMany: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            orgUnitId: "ou-f2",
            scopeMode: "THIS_ORG_UNIT",
            tenantId: "tenant-1",
            role: {
              scope: "TENANT",
              tenantId: "tenant-1",
              isArchived: false,
              rolePermissions: [{ permission: { key: "events.manage", scope: "TENANT" } }],
            },
          },
        ]),
    },
    team: {
      findFirst: vi.fn().mockResolvedValue({
        orgUnitId: null,
        teamSeasons: [{ orgUnits: [{ orgUnitId: "ou-f2", isPrimary: true }] }],
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    orgUnit: {
      findUnique: vi.fn().mockResolvedValue({
        id: "ou-f2",
        tenantId: "tenant-1",
        parentId: null,
        parent: null,
      }),
    },
  } as unknown as PrismaClient;
}

describe("PlanningAuthorizationPolicy — tournament review stage", () => {
  it("allows scoped EVENTS_MANAGE user to edit APPROVED tournaments", async () => {
    const policy = new PlanningAuthorizationPolicy(scopedTournamentPrisma());
    await expect(
      policy.canEditPlanningRecord(
        { userId: "user-scoped", tenantId: "tenant-1" },
        "tournament",
        { teamId: "team-f2", planningStage: "APPROVED", source: "MANUAL" },
      ),
    ).resolves.toBe(true);
  });

  it("still locks scoped users on APPROVED match records", async () => {
    const policy = new PlanningAuthorizationPolicy(scopedTournamentPrisma());
    await expect(
      policy.canEditPlanningRecord(
        { userId: "user-scoped", tenantId: "tenant-1" },
        "match",
        { teamId: "team-f2", planningStage: "APPROVED", source: "MANUAL" },
      ),
    ).resolves.toBe(false);
  });
});
