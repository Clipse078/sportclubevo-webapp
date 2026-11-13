import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-FIN-07E implementation inventory", () => {
  it("keeps implementation note separate from canonical proposal", () => {
    const proposalPath = join(
      process.cwd(),
      "docs/finance/SCE-FINANCE-07E-SUPPLIER-BILL-EVIDENCE-PROPOSAL.md",
    );
    const impl = read("docs/finance/SCE-FINANCE-07E-EXTERNAL-REFERENCE-LINKING.md");
    expect(impl).toContain("#969");
    expect(impl).toContain("linkSupplierBillExternalReferenceToCommitment");
    expect(impl).toContain("finance-07e-supplier-bill-evidence.test.ts");

    if (!existsSync(proposalPath)) {
      expect(impl).toContain("Canonical proposal");
      return;
    }

    const proposal = read("docs/finance/SCE-FINANCE-07E-SUPPLIER-BILL-EVIDENCE-PROPOSAL.md");
    expect(proposal).toContain("DELIVERED — external-reference linking");
    expect(proposal).toContain("PROPOSED (deferred)");
    expect(proposal).toContain("SCE-FINANCE-07E-EXTERNAL-REFERENCE-LINKING.md");
    expect(proposal).toContain("not add a second copy");
  });
});
