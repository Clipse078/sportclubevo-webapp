import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FINANCE_06A_IMPLEMENTATION,
  FINANCE_06B_IMPLEMENTATION,
  FINANCE_06C_PDF_ARTIFACT_REQUIREMENT,
  FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE,
  FINANCE_06C_PRODUCT_MODEL,
  FINANCE_PUBLISHING_PERMISSION_MODEL,
} from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";
import { FINANCE_PUBLICATION_ARTIFACT_PIPELINE } from "@/lib/finance/publishing/finance-publication-artifact-contract";

const repoRoot = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("FIN-06C PDF / export final closure contract", () => {
  it("locks PO-approved PDF slice while sharing and email remain not started", () => {
    expect(FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE.fin06cPdfExportPoVisualUat).toBe("PASS");
    expect(FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE.fin06cPdfExportFinalClosure).toBe("PASS");
    expect(FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE.fin06cPdfExportSliceStatus).toBe(
      "COMPLETE_PO_APPROVED",
    );
    expect(FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE.fin06cControlledSharingSliceStatus).toBe(
      "NOT_STARTED",
    );
    expect(FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE.fin06cEmailDistributionSliceStatus).toBe(
      "NOT_STARTED",
    );
    expect(FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE.fin06cPackageRemainsInProgress).toBe(true);
    expect(FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE.prNumber).toBe(918);
    expect(FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE.approvedVisualBaselineCommit).toMatch(/^3c6f169f/);
    expect(FINANCE_06A_IMPLEMENTATION.fin06aStatus).toBe("COMPLETE_PO_APPROVED");
    expect(FINANCE_06B_IMPLEMENTATION.fin06bStatus).toBe("COMPLETE_PO_APPROVED");
    expect(FINANCE_06B_IMPLEMENTATION.fin06cPdfExportSliceStatus).toBe("COMPLETE_PO_APPROVED");
    expect(FINANCE_06C_PRODUCT_MODEL.fin06cPdfExportSliceStatus).toBe("COMPLETE_PO_APPROVED");
    expect(FINANCE_06C_PRODUCT_MODEL.fin06cStatus).toBe("IN_PROGRESS");
  });

  it("preserves immutable snapshot PDF pipeline", () => {
    expect(FINANCE_06C_PDF_ARTIFACT_REQUIREMENT.readPath[1]).toBe("snapshotPayloadJson");
    expect(FINANCE_06C_PDF_ARTIFACT_REQUIREMENT.forbiddenReadPath[1]).toBe(
      "currentFinanceReadModel",
    );
    expect(FINANCE_PUBLICATION_ARTIFACT_PIPELINE.mutatesSnapshotOnGenerate).toBe(false);
    expect(FINANCE_PUBLICATION_ARTIFACT_PIPELINE.persistenceRequiredInR1).toBe(false);
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.viewDoesNotImplyPublish).toBe(true);
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.shareDoesNotImplyPublish).toBe(true);
  });
});

describe("FIN-06C PDF / export closure documentation", () => {
  it("records PO sign-off and immutability literals", () => {
    const closure = readRepo("docs/finance/SCE-FINANCE-06C-PDF-EXPORT-FINAL-CLOSURE.md");
    expect(closure).toContain("FIN-06C PDF / EXPORT PO VISUAL UAT = PASS");
    expect(closure).toContain("#918");
    expect(closure).toContain("161'533");
    expect(closure).toContain("162'533");
    expect(closure).toContain("212'694");
    expect(closure).toContain("213'694");
    expect(closure).toContain("NOT STARTED");
    expect(closure).toContain("REQUIRES_FUTURE_PDF_ENGINE_DECISION");
  });

  it("updates finance programme architecture status", () => {
    const architecture = readRepo(
      "docs/finance/SCE-FINANCE-06-FINANCIAL-PUBLISHING-SHARING-ARCHITECTURE.md",
    );
    expect(architecture).toContain("FIN-06C PDF / EXPORT");
    expect(architecture).toMatch(/FIN-06C PDF.*COMPLETE.*PO APPROVED/i);
    expect(architecture).toMatch(/FIN-06C.*IN PROGRESS/i);
  });
});
