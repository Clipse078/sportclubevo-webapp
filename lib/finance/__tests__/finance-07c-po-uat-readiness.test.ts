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

  it("exposes approval inbox discovery when pending work exists", () => {
    const workspace = readRepo(
      "components/admin/finance/commitment/FinanceCommitmentWorkspacePanel.tsx",
    );
    expect(workspace).toContain("data-finance-commitment-approval-inbox-link");
    expect(workspace).toContain("/dashboard/finance/commitments/approvals");
    expect(workspace).toContain("openApprovalInbox");
    expect(workspace).toContain("submittedPendingCount > 0");
    expect(workspace).toContain("canApprove");
  });
});
