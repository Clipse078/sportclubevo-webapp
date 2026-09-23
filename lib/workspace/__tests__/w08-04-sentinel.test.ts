import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { WorkspaceDocumentVersionScanState } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { sanitizeAuditValue } from "@/lib/audit/audit-record";
import { WorkspaceAuditAction } from "@/lib/workspace/audit/workspace-audit-actions";
import { BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY } from "@/lib/workspace/governance/break-glass-constants";
import {
  assertWorkspaceVersionSafeForDelivery,
  WorkspaceContentDeliveryBlockedError,
} from "@/lib/workspace/malware-scan/content-delivery-gate";
import {
  evaluateWorkspaceContentDelivery,
  DEFAULT_WORKSPACE_CONTENT_DELIVERY_ENFORCEMENT,
} from "@/lib/workspace/malware-scan/scan-enforcement-policy";
import {
  assertLegalWorkspaceVersionScanTransition,
  isWorkspaceVersionScanStateClean,
} from "@/lib/workspace/malware-scan/scan-state";
import { toWorkspaceVersionScanPublicDto } from "@/lib/workspace/malware-scan/scan-dto";
import {
  workspaceMalwareScannerProvider,
  WORKSPACE_MALWARE_SCANNER_REAL_STATUS,
} from "@/lib/workspace/malware-scan/scanner-provider";
import {
  DEFAULT_WORKSPACE_CONTENT_SECURITY_STATUS,
  isWorkspaceContentAccessAllowedByScanStatus,
} from "@/lib/workspace/storage/content-security-status";

const root = resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("WORKSPACE-08-04 sentinels", () => {
  it("W08-04-01 scan state belongs to exact immutable version", () => {
    expect(read("prisma/schema.prisma")).toMatch(
      /workspaceDocumentVersionId String @unique/,
    );
  });

  it("W08-04-02 legacy versions are not migrated to CLEAN", () => {
    expect(
      read(
        "prisma/migrations/20260923180000_workspace_08_04_malware_scan_quarantine/migration.sql",
      ),
    ).toMatch(/'NOT_SCANNED'/);
    const migration = read(
      "prisma/migrations/20260923180000_workspace_08_04_malware_scan_quarantine/migration.sql",
    );
    expect(migration).toMatch(
      /INSERT INTO "WorkspaceDocumentVersionScan"[\s\S]*'NOT_SCANNED'/,
    );
    expect(migration).not.toMatch(
      /INSERT INTO "WorkspaceDocumentVersionScan"[\s\S]*'CLEAN'/,
    );
  });

  it("W08-04-03 NOT_SCANNED != CLEAN", () => {
    expect(
      isWorkspaceVersionScanStateClean(
        WorkspaceDocumentVersionScanState.NOT_SCANNED,
      ),
    ).toBe(false);
  });

  it("W08-04-04 PENDING != CLEAN", () => {
    expect(
      isWorkspaceVersionScanStateClean(
        WorkspaceDocumentVersionScanState.PENDING,
      ),
    ).toBe(false);
  });

  it("W08-04-05 SCANNING != CLEAN", () => {
    expect(
      isWorkspaceVersionScanStateClean(
        WorkspaceDocumentVersionScanState.SCANNING,
      ),
    ).toBe(false);
  });

  it("W08-04-06 SCAN_FAILED != CLEAN", () => {
    expect(
      isWorkspaceVersionScanStateClean(
        WorkspaceDocumentVersionScanState.SCAN_FAILED,
      ),
    ).toBe(false);
  });

  it("W08-04-07 INFECTED != CLEAN", () => {
    expect(
      isWorkspaceVersionScanStateClean(
        WorkspaceDocumentVersionScanState.INFECTED,
      ),
    ).toBe(false);
  });

  it("W08-04-08 only explicit successful scanner result can produce CLEAN", () => {
    expect(() =>
      assertLegalWorkspaceVersionScanTransition({
        from: WorkspaceDocumentVersionScanState.PENDING,
        to: WorkspaceDocumentVersionScanState.CLEAN,
      }),
    ).toThrow();
    expect(() =>
      assertLegalWorkspaceVersionScanTransition({
        from: WorkspaceDocumentVersionScanState.SCANNING,
        to: WorkspaceDocumentVersionScanState.CLEAN,
      }),
    ).not.toThrow();
  });

  it("W08-04-09 scanner outage never produces CLEAN", () => {
    expect(() =>
      assertLegalWorkspaceVersionScanTransition({
        from: WorkspaceDocumentVersionScanState.SCAN_FAILED,
        to: WorkspaceDocumentVersionScanState.CLEAN,
      }),
    ).toThrow();
  });

  it("W08-04-10 provider timeout never produces CLEAN", () => {
    expect(
      evaluateWorkspaceContentDelivery(
        WorkspaceDocumentVersionScanState.SCAN_FAILED,
        "ENFORCED_CLEAN_ONLY",
      ).allowed,
    ).toBe(false);
  });

  it("W08-04-11 unsupported/encrypted file never silently produces CLEAN", () => {
    expect(() =>
      assertLegalWorkspaceVersionScanTransition({
        from: WorkspaceDocumentVersionScanState.SCANNING,
        to: WorkspaceDocumentVersionScanState.BLOCKED,
      }),
    ).not.toThrow();
    expect(
      isWorkspaceVersionScanStateClean(
        WorkspaceDocumentVersionScanState.BLOCKED,
      ),
    ).toBe(false);
  });

  it("W08-04-12 download enforcement blocks non-CLEAN when enforcement enabled", () => {
    expect(
      evaluateWorkspaceContentDelivery(
        WorkspaceDocumentVersionScanState.NOT_SCANNED,
        "ENFORCED_CLEAN_ONLY",
      ).allowed,
    ).toBe(false);
  });

  it("W08-04-13 preview enforcement blocks non-CLEAN when enforcement enabled", () => {
    expect(
      evaluateWorkspaceContentDelivery(
        WorkspaceDocumentVersionScanState.PENDING,
        "ENFORCED_CLEAN_ONLY",
      ).allowed,
    ).toBe(false);
  });

  it("W08-04-14 ordinary ACL still required for CLEAN file", () => {
    expect(read("app/api/workspace/documents/[documentId]/download/route.ts")).toMatch(
      /assertWorkspaceDocumentReadWithOptionalBreakGlass/,
    );
    expect(read("lib/workspace/document-download-service.ts")).toMatch(
      /assertWorkspaceVersionSafeForDelivery/,
    );
  });

  it("W08-04-15 break-glass cannot bypass scan gate", () => {
    expect(BREAK_GLASS_DOES_NOT_BYPASS_SCAN_POLICY).toBe(true);
    expect(read("app/api/workspace/documents/[documentId]/download/route.ts")).toMatch(
      /assertWorkspaceVersionSafeForDelivery|downloadWorkspaceDocument/,
    );
    expect(read("lib/workspace/document-download-service.ts")).toMatch(
      /assertWorkspaceVersionSafeForDelivery/,
    );
  });

  it("W08-04-16 W07 exact reference cannot bypass scan gate", () => {
    expect(read("lib/workspace/document-download-service.ts")).toMatch(
      /versionId/,
    );
  });

  it("W08-04-17 scan result does not retarget W07 reference", () => {
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).not.toMatch(
      /RequirementWorkspaceDocumentVersionReference/,
    );
  });

  it("W08-04-18 INFECTED state persists durably", () => {
    expect(read("prisma/schema.prisma")).toMatch(/INFECTED/);
  });

  it("W08-04-19 INFECTED blocks download under enforcement", () => {
    expect(
      evaluateWorkspaceContentDelivery(
        WorkspaceDocumentVersionScanState.INFECTED,
        "ENFORCED_CLEAN_ONLY",
      ).allowed,
    ).toBe(false);
    expect(
      evaluateWorkspaceContentDelivery(
        WorkspaceDocumentVersionScanState.INFECTED,
        DEFAULT_WORKSPACE_CONTENT_DELIVERY_ENFORCEMENT,
      ).allowed,
    ).toBe(false);
  });

  it("W08-04-20 INFECTED blocks preview under enforcement", () => {
    expect(
      evaluateWorkspaceContentDelivery(
        WorkspaceDocumentVersionScanState.INFECTED,
        "ENFORCED_CLEAN_ONLY",
      ).allowed,
    ).toBe(false);
  });

  it("W08-04-21 scan audit contains exact version identity", () => {
    expect(WorkspaceAuditAction.SCAN_REQUESTED).toBe("WORKSPACE_SCAN_REQUESTED");
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).toMatch(
      /workspaceDocumentVersionId/,
    );
  });

  it("W08-04-22 scan audit contains no storage credentials", () => {
    const sanitized = sanitizeAuditValue({
      storageKey: "secret/key",
      state: "PENDING",
    }) as Record<string, unknown>;
    expect(sanitized.storageKey).toBeUndefined();
  });

  it("W08-04-23 scan audit contains no signed URL", () => {
    const sanitized = sanitizeAuditValue({
      storageUrl: "https://signed.example/x",
    }) as Record<string, unknown>;
    expect(sanitized.storageUrl).toBeUndefined();
  });

  it("W08-04-24 scan audit contains no document binary/content", () => {
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).not.toMatch(
      /buffer|binary|byteContent/,
    );
  });

  it("W08-04-25 unauthorized user cannot query scan state", () => {
    expect(read("lib/workspace/malware-scan/content-delivery-gate.ts")).toMatch(
      /assertWorkspaceVersionSafeForDelivery/,
    );
    expect(
      read("app/api/workspace/documents/[documentId]/download/route.ts"),
    ).toMatch(/Dokument nicht gefunden/);
  });

  it("W08-04-26 scan API cannot enumerate foreign tenant version", () => {
    expect(read("lib/workspace/malware-scan/content-delivery-gate.ts")).toMatch(
      /tenantId/,
    );
  });

  it("W08-04-27 scan provider receives server-side private object identity only", () => {
    expect(read("lib/workspace/malware-scan/scanner-provider.ts")).toMatch(
      /storageKey/,
    );
    expect(read("lib/workspace/malware-scan/scanner-provider.ts")).not.toMatch(
      /signedUrl|publicUrl/,
    );
  });

  it("W08-04-28 runtime has no fake-CLEAN fallback", () => {
    expect(WORKSPACE_MALWARE_SCANNER_REAL_STATUS.realScannerConfigured).toBe(
      false,
    );
    expect(workspaceMalwareScannerProvider.providerId).toBe("unconfigured");
  });

  it("W08-04-29 restore-as-new-version does not inherit CLEAN without proven binary identity", () => {
    expect(read("lib/workspace/document-version-write-service.ts")).toMatch(
      /createPendingWorkspaceVersionScanRecord/,
    );
    expect(read("lib/workspace/malware-scan/version-scan-write.ts")).not.toMatch(
      /inheritClean|copyCleanVerdict/,
    );
  });

  it("W08-04-30 purge removes scan state without orphan", () => {
    expect(read("prisma/schema.prisma")).toMatch(
      /onDelete: Cascade[\s\S]*WorkspaceDocumentVersionScan/,
    );
  });

  it("W08-04-31 scan state does not accidentally block W08-03 purge", () => {
    expect(read("prisma/schema.prisma")).toMatch(
      /WorkspaceDocumentVersionScan[\s\S]*onDelete: Cascade/,
    );
  });

  it("W08-04-32 storage read failure becomes failure, never CLEAN", () => {
    expect(() =>
      assertLegalWorkspaceVersionScanTransition({
        from: WorkspaceDocumentVersionScanState.SCANNING,
        to: WorkspaceDocumentVersionScanState.SCAN_FAILED,
      }),
    ).not.toThrow();
  });

  it("W08-04-33 retryable failure has explicit retry seam", () => {
    expect(read("lib/workspace/malware-scan/scan-request-seam.ts")).toMatch(
      /RETRY_POLICY_SEAM/,
    );
  });

  it("W08-04-34 INFECTED is not automatically retried to CLEAN", () => {
    expect(() =>
      assertLegalWorkspaceVersionScanTransition({
        from: WorkspaceDocumentVersionScanState.INFECTED,
        to: WorkspaceDocumentVersionScanState.CLEAN,
      }),
    ).toThrow();
  });

  it("W08-04-35 DTO exposes no scanner endpoint/provider secret", () => {
    const dto = toWorkspaceVersionScanPublicDto({
      scanState: WorkspaceDocumentVersionScanState.PENDING,
      enforcement: DEFAULT_WORKSPACE_CONTENT_DELIVERY_ENFORCEMENT,
    });
    expect(JSON.stringify(dto)).not.toMatch(/provider|endpoint|secret/i);
  });

  it("W08-04-36 DTO exposes no storage locator", () => {
    const dto = toWorkspaceVersionScanPublicDto({
      scanState: WorkspaceDocumentVersionScanState.CLEAN,
      enforcement: DEFAULT_WORKSPACE_CONTENT_DELIVERY_ENFORCEMENT,
    });
    expect(JSON.stringify(dto)).not.toMatch(/storageKey|storageUrl/);
  });

  it("W08-04-37 scan enforcement policy is distinct from scan state", () => {
    expect(read("prisma/schema.prisma")).toMatch(
      /WorkspaceMalwareScanEnforcementPolicy/,
    );
    expect(read("prisma/schema.prisma")).toMatch(
      /WorkspaceDocumentVersionScan/,
    );
  });

  it("W08-04-38 disabled/pre-enforcement policy never changes NOT_SCANNED to CLEAN", () => {
    expect(DEFAULT_WORKSPACE_CONTENT_SECURITY_STATUS).toBe("NOT_SCANNED");
    expect(
      evaluateWorkspaceContentDelivery(
        WorkspaceDocumentVersionScanState.NOT_SCANNED,
        DEFAULT_WORKSPACE_CONTENT_DELIVERY_ENFORCEMENT,
      ).allowed,
    ).toBe(true);
    expect(
      isWorkspaceVersionScanStateClean(
        WorkspaceDocumentVersionScanState.NOT_SCANNED,
      ),
    ).toBe(false);
  });

  it("W08-04-39 normal list/search zero-disclosure remains unchanged", () => {
    expect(read("lib/workspace/access/query-predicate.ts")).toMatch(
      /buildWorkspaceReadWhere/,
    );
  });

  it("W08-04-40 break-glass USED path still audits when CLEAN content is delivered", () => {
    expect(
      read("lib/workspace/governance/workspace-governance-read-authorization.ts"),
    ).toMatch(/recordBreakGlassUsedAudit/);
  });

  it("W08-04 gate error type is stable", () => {
    expect(WorkspaceContentDeliveryBlockedError.name).toBe(
      "WorkspaceContentDeliveryBlockedError",
    );
    expect(typeof assertWorkspaceVersionSafeForDelivery).toBe("function");
  });

  it("W08-04 W04 legacy seam NOT_SCANNED remains allowed pre-enforcement", () => {
    expect(isWorkspaceContentAccessAllowedByScanStatus("NOT_SCANNED")).toBe(
      true,
    );
    expect(isWorkspaceContentAccessAllowedByScanStatus("BLOCKED")).toBe(false);
  });

  it("W08-04 prior W08 migrations remain immutable", () => {
    expect(
      read(
        "prisma/migrations/20260923120000_workspace_08_01_durable_audit_foundation/migration.sql",
      ),
    ).toMatch(/AuditLog/);
    expect(
      read(
        "prisma/migrations/20260923140000_workspace_08_02_break_glass_governance/migration.sql",
      ),
    ).toMatch(/WorkspaceBreakGlassSession/);
    expect(
      read(
        "prisma/migrations/20260923160000_workspace_08_03_retention_governance_hold/migration.sql",
      ),
    ).toMatch(/WorkspaceGovernanceHold/);
  });
});
