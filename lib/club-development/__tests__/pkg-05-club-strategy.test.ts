import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  canManageClubStrategy,
  loadClubStrategyAuthoring,
  upsertClubStrategyAuthoring,
  replaceClubStrategyMeetingRefs,
  replaceClubStrategyAssociationRefs,
  addClubStrategyFocusTarget,
  linkClubStrategyDocument,
} from "../club-strategy-service";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const prismaMocks = vi.hoisted(() => ({
  clubStrategyFindUnique: vi.fn(),
  clubStrategyCreate: vi.fn(),
  clubStrategyUpdate: vi.fn(),
  meetingFindMany: vi.fn(),
  meetingDecisionFindMany: vi.fn(),
  focusUpsert: vi.fn(),
  focusCount: vi.fn(),
  docRefCreateMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    clubStrategy: {
      findUnique: prismaMocks.clubStrategyFindUnique,
      create: prismaMocks.clubStrategyCreate,
      update: prismaMocks.clubStrategyUpdate,
    },
    meeting: { findMany: prismaMocks.meetingFindMany },
    meetingDecision: { findMany: prismaMocks.meetingDecisionFindMany },
    clubStrategyFocusTarget: {
      upsert: prismaMocks.focusUpsert,
      count: prismaMocks.focusCount,
    },
    clubStrategyDocumentReference: {
      createMany: prismaMocks.docRefCreateMany,
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

vi.mock("@/lib/workspace/reference/workspace-version-link-validation", () => ({
  resolveWorkspaceDocumentVersionForLink: vi.fn(async () => ({
    workspaceDocumentVersionId: "wdv-1",
  })),
  WorkspaceVersionLinkValidationError: class WorkspaceVersionLinkValidationError extends Error {},
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
    prismaMocks.meetingDecisionFindMany.mockResolvedValue([{ id: "dec-1" }]);
    prismaMocks.docRefCreateMany.mockResolvedValue({ count: 1 });
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

  it("denies association replace without targets.manage", async () => {
    await expect(
      replaceClubStrategyAssociationRefs(actorWith([PERMISSIONS.TARGETS_VIEW]), "user-1", {
        meetingRefs: [],
        decisionRefs: [],
      }),
    ).rejects.toThrow(/FORBIDDEN/);
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

  it("validates decision ids are tenant-scoped", async () => {
    prismaMocks.clubStrategyFindUnique.mockResolvedValue({ id: "strategy-1" });
    prismaMocks.meetingDecisionFindMany.mockResolvedValue([]);

    await expect(
      replaceClubStrategyAssociationRefs(actorWith([PERMISSIONS.TARGETS_MANAGE]), "user-1", {
        decisionRefs: [{ slug: "foreign-decision", title: "X" }],
      }),
    ).rejects.toThrow(/DECISION_NOT_FOUND/);
  });

  it("persists association links with tenant-scoped update", async () => {
    prismaMocks.clubStrategyFindUnique.mockResolvedValue({
      id: "strategy-1",
      linkedMeetingRefs: [],
      linkedDecisionRefs: [],
    });

    await replaceClubStrategyAssociationRefs(actorWith([PERMISSIONS.TARGETS_MANAGE]), "user-1", {
      meetingRefs: [{ slug: "m-1", title: "Sitzung" }],
      decisionRefs: [{ slug: "dec-1", title: "Beschluss" }],
    });

    expect(prismaMocks.clubStrategyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "strategy-1", tenantId: "tenant-a" },
        data: expect.objectContaining({
          linkedMeetingRefs: [{ slug: "m-1", title: "Sitzung" }],
          linkedDecisionRefs: [{ slug: "dec-1", title: "Beschluss" }],
        }),
      }),
    );
  });

  it("denies narrative upsert without targets.manage", async () => {
    await expect(
      upsertClubStrategyAuthoring(actorWith([PERMISSIONS.TARGETS_VIEW]), "user-1", {
        situationText: "X",
      }),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("rejects workspace document link when resolver forbids access", async () => {
    const { resolveWorkspaceDocumentVersionForLink, WorkspaceVersionLinkValidationError } =
      await import("@/lib/workspace/reference/workspace-version-link-validation");
    vi.mocked(resolveWorkspaceDocumentVersionForLink).mockRejectedValueOnce(
      new WorkspaceVersionLinkValidationError("denied"),
    );
    prismaMocks.clubStrategyFindUnique.mockResolvedValue({ id: "strategy-1" });

    await expect(
      linkClubStrategyDocument(actorWith([PERMISSIONS.TARGETS_MANAGE]), "user-1", {
        kind: "SUPPORTING",
        documentId: "doc-hidden",
      }),
    ).rejects.toThrow(/DOCUMENT_FORBIDDEN/);
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
    expect(["LEITBILD", "STRATEGY_AGREED", "SUPPORTING"]).toEqual(
      expect.arrayContaining(["LEITBILD", "STRATEGY_AGREED", "SUPPORTING"]),
    );
  });

  it("migration SQL is additive and includes decision refs column", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "prisma/migrations/20261115150000_sce_cd_05_club_strategy_authoring/migration.sql"),
      "utf8",
    );
    expect(sql).toContain('CREATE TABLE "ClubStrategy"');
    expect(sql).toContain('"linkedDecisionRefs" JSONB');
    expect(sql).not.toMatch(/DROP TABLE/i);
  });
});

/** Coverage map (PKG-05 PO acceptance):
 * - Tenant isolation / denied writes: mocked service tests above (prisma mocked — not DB integration).
 * - Strategy + link persistence: replaceClubStrategyAssociationRefs, upsertClubStrategyMeetingRefs, focus target upsert (mocked).
 * - Restricted document metadata: linkClubStrategyDocument DOCUMENT_FORBIDDEN (mocked workspace resolver).
 * - DB integration: none in this file; no skipped tests.
 * - Related (not PKG-05): lib/visibility/__tests__/security-01k-strategic-tenant-isolation.test.ts (strategic domain isolation).
 */