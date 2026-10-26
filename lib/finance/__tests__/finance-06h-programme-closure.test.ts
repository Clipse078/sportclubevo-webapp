import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FINANCE_06C_PRODUCT_MODEL,
  FINANCE_06D_PUBLICATION_SHARE_MODEL,
  FINANCE_06E_PUBLICATION_DISTRIBUTION_MODEL,
  FINANCE_06F_BACKLOG_CLASSIFICATION,
  FINANCE_06_PROGRAMME_RELEASE_CLOSURE,
  FINANCE_06A_IMPLEMENTATION,
  FINANCE_PUBLISHING_CONCEPTUAL_LOCK,
  FINANCE_PUBLISHING_PERMISSION_MODEL,
  FINANCE_PUBLICATION_SNAPSHOT_AUTHORITY,
} from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";

const repoRoot = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("FIN-06H programme release closure contract", () => {
  it("locks FIN-06 v1 complete and FIN-06F optional backlog", () => {
    expect(FINANCE_06_PROGRAMME_RELEASE_CLOSURE.fin06ProgrammeStatus).toBe(
      "COMPLETE_PO_APPROVED",
    );
    expect(FINANCE_06_PROGRAMME_RELEASE_CLOSURE.fin06eFinalPoUat).toBe("PASS");
    expect(FINANCE_06_PROGRAMME_RELEASE_CLOSURE.fin06ePoApproved).toBe(true);
    expect(FINANCE_06_PROGRAMME_RELEASE_CLOSURE.stageMergePrFin06e).toBe(920);
    expect(FINANCE_06F_BACKLOG_CLASSIFICATION.classification).toBe(
      "OPTIONAL_FUTURE_ENHANCEMENT",
    );
    expect(FINANCE_06F_BACKLOG_CLASSIFICATION.blocksFin06V1Closure).toBe(false);
    expect(FINANCE_06A_IMPLEMENTATION.fin06ProgrammeStatus).toBe("COMPLETE_PO_APPROVED");
    expect(FINANCE_06C_PRODUCT_MODEL.fin06cStatus).toBe("COMPLETE_PO_APPROVED");
    expect(FINANCE_06D_PUBLICATION_SHARE_MODEL.fin06dR2Status).toBe(
      "COMPLETE_PO_APPROVED",
    );
    expect(FINANCE_06E_PUBLICATION_DISTRIBUTION_MODEL.fin06eStatus).toBe(
      "COMPLETE_PO_APPROVED",
    );
    expect(FINANCE_06_PROGRAMME_RELEASE_CLOSURE.nextFinanceProgramme).toBe(
      "FIN-07_COMMITMENTS_AND_APPROVALS",
    );
  });

  it("preserves architecture invariants for publication and permissions", () => {
    expect(FINANCE_PUBLISHING_CONCEPTUAL_LOCK.publicationDistinctFromLiveReport).toBe(
      true,
    );
    expect(FINANCE_PUBLICATION_SNAPSHOT_AUTHORITY.reconstructFromLiveDomainOnEveryReadForbidden).toBe(
      true,
    );
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.viewDoesNotImplyDistribute).toBe(true);
    expect(FINANCE_PUBLISHING_PERMISSION_MODEL.publishDoesNotImplyDistribute).toBe(
      true,
    );
  });
});

describe("FIN-06H documentation consistency", () => {
  it("records programme closure in architecture and roadmap", () => {
    const architecture = readRepo(
      "docs/finance/SCE-FINANCE-06-FINANCIAL-PUBLISHING-SHARING-ARCHITECTURE.md",
    );
    expect(architecture).toContain("FIN-06 — COMPLETE / PO APPROVED");
    expect(architecture).toContain("FIN-06H");
    expect(architecture).toContain("FIN-06F");
    expect(architecture).toContain("FIN-07");

    const closure = readRepo("docs/finance/SCE-FINANCE-06H-PROGRAMME-CLOSURE.md");
    expect(closure).toContain("FIN_06E_PO_UAT");
    expect(closure).toContain("OPTIONAL_FUTURE_ENHANCEMENT");
    expect(closure).toContain("#920");

    const roadmap = readRepo("docs/roadmap/SCE-FINANCE-01.md");
    expect(roadmap).toMatch(/FIN-06.*COMPLETE.*PO APPROVED/i);
    expect(roadmap).toContain("FIN-07");
  });
});
