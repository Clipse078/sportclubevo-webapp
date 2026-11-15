import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CD_STRATEGY_AUTHORING_COPY } from "../product-copy";
import {
  formatStrategyPeriodSummary,
  hasPersistedClubStrategy,
} from "../club-strategy-presentation";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PKG-05 Strategie presentation", () => {
  it("uses club-facing page title and Sitzungen & Beschlüsse label", () => {
    expect(CD_STRATEGY_AUTHORING_COPY.pageTitle).toBe("Strategie");
    expect(CD_STRATEGY_AUTHORING_COPY.meetingLinksHeading).toBe("Sitzungen & Beschlüsse");
    expect(CD_STRATEGY_AUTHORING_COPY.progressHint).toMatch(/Zielerreichung/);
    expect(CD_STRATEGY_AUTHORING_COPY.progressHint).toMatch(/Umsetzungsfortschritt/);
  });

  it("distinguishes persisted strategy from empty shell", () => {
    expect(hasPersistedClubStrategy({ id: null })).toBe(false);
    expect(hasPersistedClubStrategy({ id: "row-1" })).toBe(true);
  });

  it("formats period summary for read view", () => {
    expect(
      formatStrategyPeriodSummary({
        periodLabel: "Saison 2026/27",
        periodStartsAt: "2026-07-01T00:00:00.000Z",
        periodEndsAt: "2027-06-30T00:00:00.000Z",
      }),
    ).toMatch(/Saison 2026\/27/);
  });

  it("page shell titles Strategie and authoring panel supports read/edit", () => {
    const page = read("app/(admin)/vereinsleitung/strategie/page.tsx");
    expect(page).toContain("CD_STRATEGY_AUTHORING_COPY.pageTitle");
    expect(page).not.toContain("Strategische Übersicht");

    const panel = read("components/admin/club-development/StrategyAuthoringPanel.tsx");
    expect(panel).toContain('data-testid="strategy-edit-toggle"');
    expect(panel).toContain("hasPersistedClubStrategy");
    expect(panel).toContain('data-testid="strategy-narrative-read"');
    expect(panel).toContain('data-testid="strategy-unsaved"');
  });

  it("association and documents default to linked lists outside edit mode", () => {
    const assoc = read("components/admin/club-development/StrategyAssociationLinkEditor.tsx");
    expect(assoc).toContain("editing");
    const docs = read("components/admin/club-development/StrategyDocumentReferencesSection.tsx");
    expect(docs).toContain("manageLinks = canManage && editing");
  });

  it("overview panel keeps outcome and delivery progress distinct", () => {
    const overview = read("components/admin/club-development/StrategyOverviewPanel.tsx");
    expect(overview).toContain("Zielerreichung");
    expect(overview).toContain("Umsetzungsfortschritt");
  });
});