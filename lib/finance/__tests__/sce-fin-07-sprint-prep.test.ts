import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("SCE-FIN-07 sprint preparation", () => {
  it("documents STAGE implementation drift and next increment boundaries", () => {
    const doc = read("docs/roadmap/SCE-FIN-07-SPRINT-DEPENDENCY-ASSESSMENT.md");
    expect(doc).toContain("07B");
    expect(doc).toContain("07E");
    expect(doc).toContain("no new migration without approval");
    expect(read("docs/finance/SCE-FINANCE-07E-SUPPLIER-BILL-EVIDENCE-PROPOSAL.md")).toContain("PROPOSED");
    expect(read("docs/roadmap/SCE-TOURNAMENT-PLANNER-SPRINT-STATUS.md")).toContain("#872");
  });

  it("commitments foundation routes exist on STAGE", () => {
    expect(read("app/(admin)/dashboard/finance/commitments/page.tsx")).toBeTruthy();
    expect(read("app/(admin)/dashboard/finance/commitments/approvals/page.tsx")).toBeTruthy();
  });
});
