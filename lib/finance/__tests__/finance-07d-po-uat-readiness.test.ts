import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FIN_07D_UAT_BELOW_THRESHOLD_TITLE,
  FIN_07D_UAT_EXACT_THRESHOLD_TITLE,
  FIN_07D_UAT_ABOVE_THRESHOLD_TITLE,
  buildFin07dUatAmountsForThreshold,
} from "@/lib/finance/commitment/finance-07d-uat-commitment-seed-ledger";

const repoRoot = process.cwd();

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("FIN-07D PO UAT readiness", () => {
  it("wires fail-closed readiness verification for operators", () => {
    const script = readRepo("scripts/sce-finance-07d-stage-po-uat-readiness.ts");
    expect(script).toContain("verifyFin07dPoUatReadiness");
    expect(script).toContain("process.exitCode = 1");
    expect(readRepo("lib/finance/commitment/finance-07d-po-uat-readiness.ts")).toContain(
      "STAGE_CANONICAL_DATABASE_FINGERPRINT",
    );
  });

  it("documents controlled UAT titles for threshold triple", () => {
    expect(FIN_07D_UAT_BELOW_THRESHOLD_TITLE).toContain("Below Threshold");
    expect(FIN_07D_UAT_EXACT_THRESHOLD_TITLE).toContain("Exact Threshold");
    expect(FIN_07D_UAT_ABOVE_THRESHOLD_TITLE).toContain("Above Threshold");
    const amounts = buildFin07dUatAmountsForThreshold(100_000);
    expect(amounts).toEqual({ belowMinor: 99_999, exactMinor: 100_000, aboveMinor: 100_001 });
  });

  it("wires fail-closed post-UAT cleanup for operators", () => {
    const script = readRepo("scripts/sce-finance-07d-stage-uat-commitment-cleanup.ts");
    expect(script).toContain("collectUatCommitmentCleanupInventory");
    expect(script).toContain("SCE-FINANCE-07D-UAT-CLEANUP");
  });

  it("exposes policy configuration in Finance settings workspace", () => {
    const settings = readRepo("app/(admin)/dashboard/finance/settings/page.tsx");
    expect(settings).toContain("loadFinanceCommitmentApprovalPolicyReadModel");
    const panel = readRepo("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("FinanceCommitmentApprovalPolicySettingsSection");
    const section = readRepo(
      "components/admin/finance/commitment/FinanceCommitmentApprovalPolicySettingsSection.tsx",
    );
    expect(section).toContain('data-finance-surface="settings-commitment-approval-policy"');
    expect(readRepo("messages/de.json")).toContain("Freigaben · Verpflichtungen");
  });
});
