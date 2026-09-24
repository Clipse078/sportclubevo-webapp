import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resolveCommunicationTargetForTenant } from "@/lib/communication/target-resolver";
import { resolvePlanningCollaborationTarget } from "@/lib/planning/planning-collaboration-target";
import { assertPlanningResourceExistsForTenant } from "@/lib/planning/planning-resource-identity";
import {
  linkRequirementToPlanningResource,
  listAuthorizedRequirementsForPlanningResource,
  unlinkRequirementFromPlanningResource,
} from "@/lib/planning/requirement-planning-resource-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    event: { findFirst: vi.fn() },
    trainingSeries: { findFirst: vi.fn() },
    requirement: { findFirst: vi.fn() },
    requirementPlanningResourceReference: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit/audit-record", () => ({
  writeAuditRecord: vi.fn(),
}));

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

describe("PLANNING-UX-05R1 operational parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves CLUB_EVENT collaboration target", () => {
    expect(resolvePlanningCollaborationTarget("CLUB_EVENT", "evt-club")).toEqual({
      supported: true,
      targetType: "CLUB_EVENT",
      targetId: "evt-club",
    });
  });

  it("rejects cross-tenant CLUB_EVENT communication target", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);
    await expect(
      resolveCommunicationTargetForTenant({
        tenantId: TENANT_A,
        targetType: "CLUB_EVENT",
        targetId: "evt-other-tenant",
      }),
    ).rejects.toMatchObject({ code: "TARGET_NOT_FOUND" });
  });

  it("accepts same-tenant CLUB_EVENT communication target", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      id: "evt-1",
      title: "GV",
    } as never);
    const resolved = await resolveCommunicationTargetForTenant({
      tenantId: TENANT_A,
      targetType: "CLUB_EVENT",
      targetId: "evt-1",
    });
    expect(resolved.targetId).toBe("evt-1");
  });

  it("rejects cross-tenant requirement planning resource link", async () => {
    vi.mocked(prisma.requirement.findFirst).mockResolvedValue(null);

    await expect(
      linkRequirementToPlanningResource(
        {
          tenantId: TENANT_A,
          userId: "u1",
          permissionKeys: [PERMISSIONS.REQUIREMENTS_MANAGE],
        },
        "req-other-tenant",
        { resourceType: "CLUB_EVENT", resourceId: "evt-1" },
      ),
    ).rejects.toMatchObject({ name: "RequirementValidationError" });
  });

  it("validates planning resource tenant boundary for TRAINING", async () => {
    vi.mocked(prisma.trainingSeries.findFirst)
      .mockResolvedValueOnce({ id: "series-1" } as never)
      .mockResolvedValueOnce(null);
    await assertPlanningResourceExistsForTenant(TENANT_A, {
      resourceType: "TRAINING",
      resourceId: "series-1",
    });
    await expect(
      assertPlanningResourceExistsForTenant(TENANT_A, {
        resourceType: "TRAINING",
        resourceId: "missing",
      }),
    ).rejects.toThrow(/PLANNING_RESOURCE_NOT_FOUND/);
  });

  it("does not disclose inaccessible requirements in planning counts", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue({ id: "evt-1" } as never);
    vi.mocked(prisma.requirementPlanningResourceReference.findMany).mockResolvedValue([
      {
        id: "ref-1",
        requirementId: "req-visible",
        requirement: {
          id: "req-visible",
          title: "Visible",
          status: "ACTIVE",
          tenantId: TENANT_A,
          createdByUserId: "u1",
        },
      },
      {
        id: "ref-2",
        requirementId: "req-hidden",
        requirement: {
          id: "req-hidden",
          title: "Hidden",
          status: "ACTIVE",
          tenantId: TENANT_A,
          createdByUserId: "u2",
        },
      },
    ] as never);

    const rows = await listAuthorizedRequirementsForPlanningResource(
      {
        tenantId: TENANT_A,
        userId: "viewer",
        permissionKeys: [PERMISSIONS.REQUIREMENTS_VIEW],
      },
      { resourceType: "CLUB_EVENT", resourceId: "evt-1" },
    );

    expect(rows).toHaveLength(2);
  });

  it("unlink removes association without deleting requirement", async () => {
    vi.mocked(prisma.requirementPlanningResourceReference.findFirst).mockResolvedValue({
      id: "ref-1",
      requirementId: "req-1",
      resourceType: "MATCH",
      resourceId: "m-1",
      requirement: { tenantId: TENANT_A, createdByUserId: "u1" },
    } as never);
    vi.mocked(prisma.requirementPlanningResourceReference.delete).mockResolvedValue({} as never);

    await unlinkRequirementFromPlanningResource(
      {
        tenantId: TENANT_A,
        userId: "u1",
        permissionKeys: [PERMISSIONS.REQUIREMENTS_MANAGE],
      },
      "ref-1",
    );

    expect(prisma.requirement.delete).toBeUndefined();
    expect(prisma.requirementPlanningResourceReference.delete).toHaveBeenCalledWith({
      where: { id: "ref-1" },
    });
  });
});
