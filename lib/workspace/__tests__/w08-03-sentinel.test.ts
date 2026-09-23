import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import {
  hasWorkspaceBreakGlassPermission,
  hasWorkspaceGovernanceManagePermission,
} from "@/lib/workspace/governance/break-glass-session-service";
import {
  isValidGovernanceHoldReason,
  WORKSPACE_GOVERNANCE_HOLD_MIN_REASON_LENGTH,
} from "@/lib/workspace/governance/governance-hold-constants";
import {
  WORKSPACE_DEFAULT_TRASH_RETENTION_DAYS,
  computeTrashPurgeEligibleAt,
  isTrashRetentionExpired,
} from "@/lib/workspace/governance/retention-constants";
import {
  WorkspacePurgeEligibilityStatus,
  evaluateWorkspaceDocumentPurgeEligibility,
} from "@/lib/workspace/governance/purge-eligibility";

describe("WORKSPACE-08-03 sentinels", () => {
  const root = resolve(__dirname, "../../..");
  const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

  it("W08-03-01 default trash retention is explicit (60 days)", () => {
    expect(WORKSPACE_DEFAULT_TRASH_RETENTION_DAYS).toBe(60);
  });

  it("W08-03-02 retention not expired blocks purge eligibility", async () => {
    const trashedAt = new Date();
    const client = {
      workspaceDocument: {
        findFirst: vi.fn().mockResolvedValue({
          id: "d1",
          status: "TRASHED",
          archivedAt: null,
          trashedAt,
          folderId: null,
        }),
      },
      workspaceTrashRetentionPolicy: { findUnique: vi.fn().mockResolvedValue(null) },
      workspaceGovernanceHold: { findMany: vi.fn().mockResolvedValue([]) },
      taskDocumentReference: { findMany: vi.fn().mockResolvedValue([]) },
      requirementWorkspaceDocumentVersionReference: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      workspaceFolder: { findFirst: vi.fn() },
    };

    const result = await evaluateWorkspaceDocumentPurgeEligibility(client as never, {
      tenantId: "t1",
      documentId: "d1",
      now: trashedAt,
    });

    expect(result?.eligible).toBe(false);
    expect(result?.status).toBe(WorkspacePurgeEligibilityStatus.RETENTION_NOT_EXPIRED);
  });

  it("W08-03-03 expired retention with no blockers is eligible", async () => {
    const trashedAt = new Date("2020-01-01T00:00:00.000Z");
    const client = {
      workspaceDocument: {
        findFirst: vi.fn().mockResolvedValue({
          id: "d1",
          status: "TRASHED",
          archivedAt: null,
          trashedAt,
          folderId: null,
        }),
      },
      workspaceTrashRetentionPolicy: { findUnique: vi.fn().mockResolvedValue(null) },
      workspaceGovernanceHold: { findMany: vi.fn().mockResolvedValue([]) },
      taskDocumentReference: { findMany: vi.fn().mockResolvedValue([]) },
      requirementWorkspaceDocumentVersionReference: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      workspaceFolder: { findFirst: vi.fn() },
    };

    const result = await evaluateWorkspaceDocumentPurgeEligibility(client as never, {
      tenantId: "t1",
      documentId: "d1",
      now: new Date("2030-01-01T00:00:00.000Z"),
    });

    expect(result?.eligible).toBe(true);
  });

  it("W08-03-04 active document hold blocks purge", async () => {
    const trashedAt = new Date("2020-01-01T00:00:00.000Z");
    const client = {
      workspaceDocument: {
        findFirst: vi.fn().mockResolvedValue({
          id: "d1",
          status: "TRASHED",
          archivedAt: null,
          trashedAt,
          folderId: null,
        }),
      },
      workspaceTrashRetentionPolicy: { findUnique: vi.fn().mockResolvedValue(null) },
      workspaceGovernanceHold: {
        findMany: vi.fn().mockResolvedValue([
          { id: "h1", scopeType: "DOCUMENT", folderId: null },
        ]),
      },
      taskDocumentReference: { findMany: vi.fn().mockResolvedValue([]) },
      requirementWorkspaceDocumentVersionReference: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      workspaceFolder: { findFirst: vi.fn() },
    };

    const result = await evaluateWorkspaceDocumentPurgeEligibility(client as never, {
      tenantId: "t1",
      documentId: "d1",
      now: new Date("2030-01-01T00:00:00.000Z"),
    });

    expect(result?.status).toBe(WorkspacePurgeEligibilityStatus.ACTIVE_GOVERNANCE_HOLD);
  });

  it("W08-03-10 workspace.break_glass cannot create holds (API permission)", () => {
    expect(
      hasWorkspaceGovernanceManagePermission([PERMISSIONS.WORKSPACE_BREAK_GLASS]),
    ).toBe(false);
  });

  it("W08-03-11 workspace.break_glass cannot purge (cron uses CRON_SECRET only)", () => {
    expect(read("app/api/cron/workspace-trash-purge/route.ts")).not.toMatch(
      /breakGlass|WORKSPACE_BREAK_GLASS/i,
    );
  });

  it("W08-03-12 governance.manage required for hold mutations", () => {
    expect(read("app/api/workspace/governance/holds/route.ts")).toMatch(
      /WORKSPACE_GOVERNANCE_MANAGE/,
    );
  });

  it("W08-03-16 hold creation audit action defined", () => {
    expect(WorkspaceAuditAction.GOVERNANCE_HOLD_CREATED).toBe(
      "WORKSPACE_GOVERNANCE_HOLD_CREATED",
    );
  });

  it("W08-03-17 hold release audit action defined", () => {
    expect(WorkspaceAuditAction.GOVERNANCE_HOLD_RELEASED).toBe(
      "WORKSPACE_GOVERNANCE_HOLD_RELEASED",
    );
  });

  it("W08-03-18 purge completion audit action defined", () => {
    expect(WorkspaceAuditAction.PURGE_COMPLETED).toBe("WORKSPACE_PURGE_COMPLETED");
  });

  it("W08-03-19 hold create uses transactional governance audit", () => {
    expect(read("lib/workspace/governance/governance-hold-service.ts")).toMatch(
      /\$transaction[\s\S]*writeWorkspaceGovernanceAudit/,
    );
  });

  it("W08-03-20 ordinary list/search predicates unchanged", () => {
    expect(read("lib/workspace/access/query-predicate.ts")).not.toMatch(
      /governanceHold|GovernanceHold/i,
    );
  });

  it("W08-03-21 break-glass list/search unchanged (W08-02 regression)", () => {
    expect(read("lib/workspace/access/query-predicate.ts")).not.toMatch(
      /breakGlass|break_glass/i,
    );
  });

  it("W08-03-22 purge eligibility centralized (not scattered in routes)", () => {
    expect(read("lib/workspace/governance/purge-eligibility.ts")).toMatch(
      /evaluateWorkspaceDocumentPurgeEligibility/,
    );
    expect(read("app/api/workspace/documents/[documentId]/permanent/route.ts")).toMatch(
      /deleteWorkspaceDocumentPermanently/,
    );
    expect(
      read("app/api/workspace/documents/[documentId]/permanent/route.ts"),
    ).not.toMatch(/evaluateWorkspaceDocumentPurgeEligibility/);
  });

  it("W08-03-25 storage purge fails closed on provider failure", () => {
    expect(read("lib/workspace/governance/workspace-purge-storage.ts")).toMatch(
      /PROVIDER_FAILURE/,
    );
    expect(read("lib/workspace/governance/workspace-document-purge-service.ts")).toMatch(
      /if \(!storageResult\.ok\)/,
    );
  });

  it("W08-03-28 active content cannot be purged", async () => {
    const client = {
      workspaceDocument: {
        findFirst: vi.fn().mockResolvedValue({
          id: "d1",
          status: "ACTIVE",
          archivedAt: null,
          trashedAt: null,
          folderId: null,
        }),
      },
      workspaceTrashRetentionPolicy: { findUnique: vi.fn().mockResolvedValue(null) },
      workspaceGovernanceHold: { findMany: vi.fn() },
      taskDocumentReference: { findMany: vi.fn() },
      requirementWorkspaceDocumentVersionReference: { findMany: vi.fn() },
      workspaceFolder: { findFirst: vi.fn() },
    };

    const result = await evaluateWorkspaceDocumentPurgeEligibility(client as never, {
      tenantId: "t1",
      documentId: "d1",
    });

    expect(result?.status).toBe(WorkspacePurgeEligibilityStatus.NOT_TRASHED);
  });

  it("W08-03-30 W08-01 migration remains immutable", () => {
    expect(
      read(
        "prisma/migrations/20260923120000_workspace_08_01_durable_audit_foundation/migration.sql",
      ),
    ).toMatch(/AuditLog/);
  });

  it("W08-03-30b W08-02 migration remains immutable", () => {
    expect(
      read(
        "prisma/migrations/20260923140000_workspace_08_02_break_glass_governance/migration.sql",
      ),
    ).toMatch(/WorkspaceBreakGlassSession/);
  });

  it("W08-03 hold reason rejects generic empty-equivalent values", () => {
    expect(isValidGovernanceHoldReason("legal hold")).toBe(false);
    expect(
      isValidGovernanceHoldReason(
        "Contractual retention dispute REF-2026-14 until counsel review completes.",
      ),
    ).toBe(true);
    expect(WORKSPACE_GOVERNANCE_HOLD_MIN_REASON_LENGTH).toBeGreaterThanOrEqual(12);
  });

  it("W08-03 retention start is trashedAt + retentionDays", () => {
    const trashedAt = new Date("2026-01-01T00:00:00.000Z");
    const eligibleAt = computeTrashPurgeEligibleAt(trashedAt, 60);
    expect(isTrashRetentionExpired(trashedAt, 60, eligibleAt)).toBe(true);
  });

  it("W08-03 break_glass does not imply governance.manage", () => {
    expect(hasWorkspaceBreakGlassPermission([PERMISSIONS.WORKSPACE_MANAGE])).toBe(
      false,
    );
  });
});
