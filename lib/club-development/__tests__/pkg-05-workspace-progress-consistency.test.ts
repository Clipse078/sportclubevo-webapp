import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PKG-05 consolidated workspace delivery progress consistency", () => {
  it("derives Vorhaben card progress from computeInitiativeProgressSnapshot at load time", () => {
    const backlog = read("app/api/club-development/initiatives/backlog/route.ts");
    const page = read("app/(admin)/vereinsleitung/vorhaben-und-umsetzung/page.tsx");
    const workspace = read("lib/club-development/vorhaben-workspace.ts");
    expect(backlog).toContain("loadInitiativeDeliveryProgressPercentByIds");
    expect(page).toContain("loadInitiativeDeliveryProgressPercentByIds");
    expect(workspace).toContain("computeInitiativeProgressSnapshot");
    expect(backlog).not.toContain("row.progress ?? 0");
    expect(page).not.toContain("row.progress ?? 0");
  });

  it("documents stored Initiative.progress as cache-only in delivery loader", () => {
    expect(read("lib/club-development/initiative-delivery-progress-presentation.ts")).toMatch(/cache/i);
    expect(read("lib/club-development/initiative-delivery-progress.ts")).toContain(
      "computeInitiativeProgressSnapshot",
    );
  });

  it("refreshes strategy supporting counts without router refresh on association save", () => {
    const assoc = read("components/admin/club-development/StrategyAssociationLinkEditor.tsx");
    const panel = read("components/admin/club-development/StrategyAuthoringPanel.tsx");
    expect(assoc).toContain("onAssociationsSaved");
    expect(assoc).not.toContain("router.refresh()");
    expect(panel).toContain("strategySupportingMaterialCounts");
    expect(panel).toContain("handleAssociationsSaved");
    expect(panel).toContain("handleDocumentReferencesChanged");
  });
});