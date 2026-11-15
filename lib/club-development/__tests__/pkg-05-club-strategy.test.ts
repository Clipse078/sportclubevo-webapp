import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClubStrategyDocumentKind } from "@prisma/client";
import {
  canManageClubStrategy,
  loadClubStrategyAuthoring,
  upsertClubStrategyAuthoring,
  replaceClubStrategyMeetingRefs,
  addClubStrategyFocusTarget,
} from "../club-strategy-service";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const prismaMocks = vi.hoisted(() => ({
  clubStrategyFindUnique: vi.fn(),
  clubStrategyCreate: vi.fn(),
  clubStrategyUpdate: vi.fn(),
  meetingFindMany: vi.fn(),
  focusUpsert: vi.fn(),
  focusCount: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    clubStrategy: {
      findUnique: prismaMocks.clubStrategyFindUnique,
      create: prismaMocks.clubStrategyCreate,
      update: prismaMocks.clubStrategyUpdate,
    },
    meeting: { findMany: prismaMocks.meetingFindMany },
    clubStrategyFocusTarget: {
      upsert: prismaMocks.focusUpsert,
      count: prismaMocks.focusCount,
    },
  },
}));

vi.mock("@/lib/meetings/meeting-person-payload", () => ({
  resolveMeetingPersonSnapshot: vi.fn(async (_tenantId: string, personId: string) => ({
    personId,
    displayName: "Pat Verantwortlich",
    firstName: "Pat",
    lastName: "Verantwortlich",
  })),
}));

vi.mock("@/lib/visibility/visibility-guards", () => ({
  requireTargetAccess: vi.fn(async () => ({ ok: true, entity: { id: "target-1" } })),
}));

vi.mock("@/lib/workspace/reference/resolve-workspace-version-references", () => ({
  resolveTaskDocumentReferencePresentations: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/audit/audit-log", () => ({
  logAuditEvent: vi.fn(),
}));

function actorWith(perms: string[]): ActorContext {
  return {
    tenantId: "tenant-a",
    userId: "user-1",
    permissionKeys: perms,
    roleKeys: [],
    teamIds: [],
    orgUnitIds: [],
    personId: null,
  } as ActorContext;
}

describe("PKG-05 club strategy authoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.clubStrategyFindUnique.mockResolvedValue(null);
    prismaMocks.clubStrategyCreate.mockResolvedValue({ id: "strategy-1" });
    prismaMocks.clubStrategyUpdate.mockResolvedValue({ id: "strategy-1", contentRevision: 2 });
    prismaMocks.focusCount.mockResolvedValue(0);
    prismaMocks.focusUpsert.mockResolvedValue({});
    prismaMocks.meetingFindMany.mockResolvedValue([{ slug: "m-1" }]);
  });

  it("denies manage without targets.manage", () => {
    expect(canManageClubStrategy(actorWith([PERMISSIONS.TARGETS_VIEW]))).toBe(false);
    expect(canManageClubStrategy(actorWith([PERMISSIONS.TARGETS_MANAGE]))).toBe(true);
  });

  it("returns empty authoring shell when no row exists", async () => {
    const result = await loadClubStrategyAuthoring(actorWith([PERMISSIONS.TARGETS_VIEW]), "user-1");
    expect(result?.id).toBeNull();
    expect(result?.focusTargets).toEqual([]);
    expect(result?.documentReferences).toEqual([]);
  });

  it("isolates tenant on upsert via tenantId in update", async () => {
    prismaMocks.clubStrategyFindUnique.mockResolvedValueOnce({ id: "strategy-1" }).mockResolvedValueOnce({
      situationText: null,
      alignmentText: null,
      responsiblePersonId: null,
      periodLabel: null,
      periodStartsAt: null,
      periodEndsAt: null,
      nextReviewAt: null,
      contentRevision: 1,
    });

    await upsertClubStrategyAuthoring(actorWith([PERMISSIONS.TARGETS_MANAGE]), "user-1", {
      situationText: "Neue Lage",
    });

    expect(prismaMocks.clubStrategyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "strategy-1", tenantId: "tenant-a" },
      }),
    );
  });

  it("validates meeting slugs are tenant-scoped", async () => {
    prismaMocks.clubStrategyFindUnique.mockResolvedValue({ id: "strategy-1", linkedMeetingRefs: [] });
    prismaMocks.meetingFindMany.mockResolvedValue([]);

    await expect(
      replaceClubStrategyMeetingRefs(actorWith([PERMISSIONS.TARGETS_MANAGE]), "user-1", [
        { slug: "unknown-meeting", title: "X" },
      ]),
    ).rejects.toThrow(/MEETING_NOT_FOUND/);
  });

  it("links focus target only after target access guard", async () => {
    prismaMocks.clubStrategyFindUnique.mockResolvedValue({ id: "strategy-1" });

    await addClubStrategyFocusTarget(actorWith([PERMISSIONS.TARGETS_MANAGE]), "user-1", "target-42");

    expect(prismaMocks.focusUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubStrategyId_targetId: { clubStrategyId: "strategy-1", targetId: "target-42" } },
      }),
    );
  });

  it("keeps progress semantics separate in strategy overview module", async () => {
    const { computeTargetOutcomePercent } = await import("../target-outcome-progress");
    const outcome = computeTargetOutcomePercent([
      { targetValue: 100, currentValue: 0, direction: "INCREASE" },
    ]);
    expect(outcome).toBe(0);
    expect(
      computeTargetOutcomePercent([{ targetValue: 0, currentValue: 0, direction: "INCREASE" }]),
    ).toBeNull();
  });

  it("documents strategy document kinds for workspace linking", () => {
    expect(ClubStrategyDocumentKind.LEITBILD).toBe("LEITBILD");
    expect(ClubStrategyDocumentKind.STRATEGY_AGREED).toBe("STRATEGY_AGREED");
    expect(ClubStrategyDocumentKind.SUPPORTING).toBe("SUPPORTING");
  });
});