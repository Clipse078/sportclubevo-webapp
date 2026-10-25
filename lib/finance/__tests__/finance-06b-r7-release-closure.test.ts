import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FINANCE_06B_IMPLEMENTATION,
  FINANCE_06B_R7_RELEASE_CLOSURE,
  FINANCE_06A_IMPLEMENTATION,
  FINANCE_06C_PRODUCT_MODEL,
  FINANCE_PUBLISHING_CONCEPTUAL_LOCK,
  FINANCE_PUBLISHING_PERMISSION_MODEL,
  FINANCE_PUBLICATION_DEFINITION,
} from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";

const repoRoot = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("FIN-06B-R7 release closure contract", () => {
  it("locks FIN-06B PO-approved completion and FIN-06C not started", () => {
    expect(FINANCE_06B_R7_RELEASE_CLOSURE.fin06bFinalProductOwnerVisualUat).toBe("PASS");
    expect(FINANCE_06B_R7_RELEASE_CLOSURE.fin06bPublicationImmutability).toBe("PASS");
    expect(FINANCE_06B_R7_RELEASE_CLOSURE.fin06bPublicationVersioning).toBe("PASS");
    expect(FINANCE_06B_R7_RELEASE_CLOSURE.fin06bR7FinalClosure).toBe("PASS");
    expect(FINANCE_06B_R7_RELEASE_CLOSURE.mergeAuthorizationPending).toBe(false);
    expect(FINANCE_06B_R7_RELEASE_CLOSURE.prNumber).toBe(917);
    expect(FINANCE_06B_R7_RELEASE_CLOSURE.fin06cStatus).toBe("DEFINED_NOT_STARTED");
    expect(FINANCE_06B_R7_RELEASE_CLOSURE.fin06ProgrammeRemainsInProgress).toBe(true);
    expect(FINANCE_06A_IMPLEMENTATION.fin06aStatus).toBe("COMPLETE_PO_APPROVED");
    expect(FINANCE_06A_IMPLEMENTATION.fin06bStatus).toBe("COMPLETE_PO_APPROVED");
    expect(FINANCE_06B_IMPLEMENTATION.fin06bStatus).toBe("COMPLETE_PO_APPROVED");
    expect(FINANCE_06B_IMPLEMENTATION.fin06bR6Version2PoUat).toBe("PASS");
    expect(FINANCE_06C_PRODUCT_MODEL.fin06cStatus).toBe("IN_PROGRESS");
  });

  it("preserves distinct financial data, report, publication, and share concepts", () => {
    expect(FINANCE_PUBLISHING_CONCEPTUAL_LOCK.publicationDistinctFromLiveReport).toBe(true);
    expect(FINANCE_PUBLISHING_CONCEPTUAL_LOCK.liveShareDistinctFromPublication).toBe(true);
    expect(FINANCE_PUBLICATION_DEFINITION.publishedFinancialReportMeaning).toContain(
      "VERSIONED_AUDITABLE_SNAPSHOT",
    );
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.viewDoesNotImplyPublish).toBe(true);
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.shareDoesNotImplyPublish).toBe(true);
  });
});

describe("FIN-06B-R7 documentation consistency", () => {
  it("records final PO UAT and immutability checkpoints in architecture doc", () => {
    const architecture = readRepo(
      "docs/finance/SCE-FINANCE-06-FINANCIAL-PUBLISHING-SHARING-ARCHITECTURE.md",
    );
    expect(architecture).toContain("FIN-06B-R7");
    expect(architecture).toContain("FIN-06B FINAL PRODUCT OWNER VISUAL UAT = PASS");
    expect(architecture).toContain("COMPLETE / PO APPROVED");
    expect(architecture).toContain("FIN-06C");
    expect(architecture).toMatch(/FIN-06C.*IN PROGRESS/i);
    expect(architecture).not.toContain("FIN-06B PO UAT PENDING");
  });

  it("documents R7 closure package with PR #917", () => {
    const r7 = readRepo("docs/finance/SCE-FINANCE-06B-R7-FINAL-CLOSURE.md");
    expect(r7).toContain("FIN-06B-R7");
    expect(r7).toContain("#917");
    expect(r7).toContain("161'533");
    expect(r7).toContain("162'533");
    expect(r7).toContain("snapshotPayloadJson");
  });

  it("updates finance programme roadmap", () => {
    const roadmap = readRepo("docs/roadmap/SCE-FINANCE-01.md");
    expect(roadmap).toContain("FIN-06B");
    expect(roadmap).toMatch(/FIN-06B.*COMPLETE.*PO APPROVED/i);
    expect(roadmap).toContain("FIN-06C");
  });
});

describe("FIN-06B-R7 binary control compliance", () => {
  const publicationUiSources = [
    "components/admin/finance/reporting/FinanceManagementPnlPublicationDialog.tsx",
    "components/admin/finance/reporting/FinancePublicationInspectionSheet.tsx",
    "components/admin/finance/reporting/FinanceReportingPublicationBar.tsx",
  ];

  it("introduces no new binary checkbox controls in publication UI slice", () => {
    for (const relativePath of publicationUiSources) {
      const source = readRepo(relativePath);
      expect(source, relativePath).not.toContain('type="checkbox"');
    }
  });
});
