import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-FIN-07E implementation inventory", () => {
  it("documents implementation without duplicating canonical proposal doc", () => {
    expect(
      existsSync(join(process.cwd(), "docs/finance/SCE-FINANCE-07E-SUPPLIER-BILL-EVIDENCE-PROPOSAL.md")),
    ).toBe(false);
    const impl = read("docs/finance/SCE-FINANCE-07E-EXTERNAL-REFERENCE-LINKING.md");
    expect(impl).toContain("#969");
    expect(impl).toContain("linkSupplierBillExternalReferenceToCommitment");
    expect(impl).toContain("finance-07e-supplier-bill-evidence.test.ts");
  });
});
