import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FIN_07C_UAT_PENDING_APPROVAL_TITLE,
  FIN_07C_UAT_REJECTION_TITLE,
} from "@/lib/finance/commitment/finance-07c-uat-commitment-seed-ledger";

const repoRoot = process.cwd();

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("FIN-07C PO UAT readiness", () => {
  it("wires fail-closed readiness verification for operators", () => {
    const script = readRepo("scripts/sce-finance-07c-stage-po-uat-readiness.ts");
    expect(script).toContain("verifyFin07cPoUatReadiness");
    expect(script).toContain("process.exitCode = 1");
    expect(readRepo("lib/finance/commitment/finance-07c-po-uat-readiness.ts")).toContain(
      "STAGE_CANONICAL_DATABASE_FINGERPRINT",
    );
  });

  it("documents controlled UAT titles for cleanup ledger parity", () => {
    expect(FIN_07C_UAT_PENDING_APPROVAL_TITLE).toContain("Freigabe");
    expect(FIN_07C_UAT_REJECTION_TITLE).toContain("Ablehnung");
  });

  it("wires fail-closed post-UAT cleanup for operators", () => {
    const script = readRepo("scripts/sce-finance-07c-stage-uat-commitment-cleanup.ts");
    expect(script).toContain("collectUatCommitmentCleanupInventory");
    expect(script).toContain("SCE-FINANCE-07C-UAT-CLEANUP");
  });

  it("exposes approval inbox discovery when pending work exists", () => {
    const workspace = readRepo(
      "components/admin/finance/commitment/FinanceCommitmentWorkspacePanel.tsx",
    );
    expect(workspace).toContain("FinanceCommitmentSummarySegments");
    const summary = readRepo(
      "components/admin/finance/commitment/FinanceCommitmentSummarySegments.tsx",
    );
    expect(summary).toContain("data-finance-commitment-approval-inbox-link");
    expect(summary).toContain("/dashboard/finance/commitments/approvals");
    expect(summary).toContain("summaryPendingOpenApprovals");
    expect(summary).toContain("pendingCount > 0");
    expect(summary).toContain("canApprove");
  });
});
