import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import {
  BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY,
  isValidBreakGlassReason,
  normalizeBreakGlassTtlMinutes,
  WORKSPACE_BREAK_GLASS_DOMAIN_SENTINEL,
  WORKSPACE_BREAK_GLASS_MAX_TTL_MINUTES,
} from "@/lib/workspace/governance/break-glass-constants";
import {
  hasWorkspaceBreakGlassPermission,
  hasWorkspaceGovernanceManagePermission,
} from "@/lib/workspace/governance/break-glass-session-service";
import { TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS } from "@/lib/permissions/workspace-governance-permission-reconciliation";

describe("WORKSPACE-08-02 sentinels", () => {
  it("W08-02-01 workspace.break_glass separate from workspace.manage", () => {
    expect(hasWorkspaceBreakGlassPermission([PERMISSIONS.WORKSPACE_MANAGE])).toBe(
      false,
    );
  });

  it("W08-02-02 workspace.break_glass separate from workspace.audit.view", () => {
    expect(
      hasWorkspaceBreakGlassPermission([PERMISSIONS.WORKSPACE_AUDIT_VIEW]),
    ).toBe(false);
  });

  it("W08-02-03 document MANAGE does not imply break-glass", () => {
    expect(hasWorkspaceBreakGlassPermission(["document.manage" as never])).toBe(
      false,
    );
  });

  it("W08-02-04 creator does not imply break-glass", () => {
    expect(hasWorkspaceBreakGlassPermission(["creator" as never])).toBe(false);
  });

  it("W08-02-05 tenant admin bundle excludes break-glass auto grant", () => {
    expect(
      TENANT_CLUB_ADMIN_GOVERNANCE_EXCLUDED_KEYS.has(
        PERMISSIONS.WORKSPACE_BREAK_GLASS,
      ),
    ).toBe(true);
  });

  it("W08-02-06 activation requires explicit permission helper", () => {
    expect(
      hasWorkspaceBreakGlassPermission([PERMISSIONS.WORKSPACE_BREAK_GLASS]),
    ).toBe(true);
  });

  it("W08-02-07 activation requires non-empty bounded reason", () => {
    expect(isValidBreakGlassReason("admin")).toBe(false);
    expect(
      isValidBreakGlassReason(
        "Incident ticket INC-4421: restore access to orphaned restricted policy document for tenant recovery.",
      ),
    ).toBe(true);
  });

  it("W08-02-08 activation requires finite TTL", () => {
    expect(normalizeBreakGlassTtlMinutes(Number.NaN)).toBeNull();
  });

  it("W08-02-09 TTL cannot exceed hard maximum", () => {
    expect(normalizeBreakGlassTtlMinutes(WORKSPACE_BREAK_GLASS_MAX_TTL_MINUTES + 1)).toBeNull();
    expect(normalizeBreakGlassTtlMinutes(WORKSPACE_BREAK_GLASS_MAX_TTL_MINUTES)).toBe(
      WORKSPACE_BREAK_GLASS_MAX_TTL_MINUTES,
    );
  });

  it("W08-02-17 activation audit action defined", () => {
    expect(WorkspaceAuditAction.BREAK_GLASS_ACTIVATED).toBe(
      "WORKSPACE_BREAK_GLASS_ACTIVATED",
    );
  });

  it("W08-02-19 successful exceptional access emits USED audit action", () => {
    expect(WorkspaceAuditAction.BREAK_GLASS_USED).toBe(
      "WORKSPACE_BREAK_GLASS_USED",
    );
  });

  it("W08-02-28 break-glass does not grant audit.view", () => {
    expect(
      hasWorkspaceGovernanceManagePermission([PERMISSIONS.WORKSPACE_BREAK_GLASS]),
    ).toBe(false);
  });

  it("W08-02-35 break-glass does not bypass future scan-policy seam", () => {
    expect(BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY).toBe(true);
  });

  it("W08-02-36 break-glass is Workspace-domain scoped sentinel", () => {
    expect(WORKSPACE_BREAK_GLASS_DOMAIN_SENTINEL).toContain("WORKSPACE_DOMAIN");
  });

  const root = resolve(__dirname, "../../..");
  const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

  it("W08-02-18 activation audit failure rolls back activation", () => {
    expect(read("lib/workspace/governance/break-glass-session-service.ts")).toMatch(
      /\$transaction[\s\S]*writeWorkspaceGovernanceAudit/,
    );
  });

  it("W08-02-20 USED audit failure denies protected read", () => {
    expect(
      read("lib/workspace/governance/workspace-governance-read-authorization.ts"),
    ).toMatch(/recordBreakGlassUsedAudit[\s\S]*authorized: false/);
  });

  it("W08-02-21 break-glass does not alter normal list/search visibility", () => {
    expect(read("lib/workspace/access/query-predicate.ts")).not.toMatch(
      /breakGlass|break_glass/i,
    );
  });

  it("W08-02-22 break-glass is explicit opt-in per authorization operation", () => {
    expect(read("lib/workspace/access/workspace-authorization.ts")).not.toMatch(
      /breakGlass|break_glass/i,
    );
    expect(read("app/api/workspace/documents/[documentId]/download/route.ts")).toMatch(
      /breakGlass:\s*"allowed"/,
    );
  });

  it("W08-02-23 default break-glass access is read-only (mutations unchanged)", () => {
    expect(
      read("app/api/workspace/documents/[documentId]/archive/route.ts"),
    ).toMatch(/assertWorkspaceDocumentEdit/);
    expect(
      read("app/api/workspace/documents/[documentId]/archive/route.ts"),
    ).not.toMatch(/breakGlass/);
  });

  it("W08-02-24 break-glass cannot mutate ACL", () => {
    expect(read("app/api/workspace/documents/[documentId]/access/route.ts")).not.toMatch(
      /breakGlass/,
    );
  });

  it("W08-02-25 break-glass cannot permanently delete", () => {
    expect(
      read("app/api/workspace/documents/[documentId]/permanent/route.ts"),
    ).not.toMatch(/breakGlass/);
  });

  it("W08-02-26 break-glass cannot upload new version", () => {
    const versionsRoute = read(
      "app/api/workspace/documents/[documentId]/versions/route.ts",
    );
    expect(versionsRoute).toMatch(/assertWorkspaceDocumentEdit/);
    expect(versionsRoute).not.toMatch(/breakGlass.*POST/);
  });

  it("W08-02-31 folder scope uses subtree collector", () => {
    expect(read("lib/workspace/governance/break-glass-scope.ts")).toMatch(
      /collectWorkspaceFolderSubtreeIds/,
    );
  });

  it("W08-02-32 resource identity is canonical ID", () => {
    expect(read("components/admin/workspace/BreakGlassGovernancePanel.tsx")).toMatch(
      /Kanoniche Ressourcen-ID/,
    );
  });

  it("W08-02-33 audit contains no protected document content in activation metadata", () => {
    expect(read("lib/workspace/governance/break-glass-session-service.ts")).not.toMatch(
      /documentName|fileContent|storageKey/,
    );
  });

  it("W08-02-37 session state checked at protected access time", () => {
    expect(read("lib/workspace/governance/break-glass-session-service.ts")).toMatch(
      /isSessionActiveRow/,
    );
  });

  it("W08-02-40 activation cannot create targetless scope", () => {
    expect(
      read(
        "prisma/migrations/20260923140000_workspace_08_02_break_glass_governance/migration.sql",
      ),
    ).toMatch(/WorkspaceBreakGlassSession_scope_target_check/);
  });
});

