import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeAccountVarianceMetrics } from "@/lib/finance/actual/variance-semantics";
import {
  financeVarianceComparisonSemanticTextClass,
  financeVarianceFavorabilityLabelKey,
  varianceFavorabilityToFeedbackTone,
} from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import { sceSemanticIconClass } from "@/lib/design-system/sce-feedback-status-micro-ux";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
  "utf8",
);
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");
const en = readFileSync(join(process.cwd(), "messages/en.json"), "utf8");
const fr = readFileSync(join(process.cwd(), "messages/fr.json"), "utf8");
const itLocale = readFileSync(join(process.cwd(), "messages/it.json"), "utf8");

describe("FIN-03A R5 variance favorability presentation", () => {
  it("maps favorable INCOME to success semantic text", () => {
    const m = computeAccountVarianceMetrics({
      canonicalSemantic: "INCOME",
      approvedBudgetMinor: 100_00,
      actualMinor: 110_00,
    });
    expect(m.favorability).toBe("FAVORABLE");
    expect(financeVarianceComparisonSemanticTextClass({
      favorability: m.favorability,
      hasComparison: true,
    })).toBe(sceSemanticIconClass("SUCCESS"));
  });

  it("maps unfavorable INCOME to error semantic text", () => {
    const m = computeAccountVarianceMetrics({
      canonicalSemantic: "INCOME",
      approvedBudgetMinor: 100_00,
      actualMinor: 90_00,
    });
    expect(m.favorability).toBe("UNFAVORABLE");
    expect(financeVarianceComparisonSemanticTextClass({
      favorability: m.favorability,
      hasComparison: true,
    })).toBe(sceSemanticIconClass("ERROR"));
  });

  it("maps favorable EXPENSE to success semantic even when raw delta is negative", () => {
    const m = computeAccountVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      approvedBudgetMinor: 50_000_00,
      actualMinor: 13_500_00,
    });
    expect(m.rawDeltaMinor).toBe(-36_500_00);
    expect(m.favorability).toBe("FAVORABLE");
    expect(financeVarianceComparisonSemanticTextClass({
      favorability: m.favorability,
      hasComparison: true,
    })).toBe(sceSemanticIconClass("SUCCESS"));
  });

  it("maps unfavorable EXPENSE to error semantic text", () => {
    const m = computeAccountVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      approvedBudgetMinor: 100_00,
      actualMinor: 110_00,
    });
    expect(m.favorability).toBe("UNFAVORABLE");
    expect(financeVarianceComparisonSemanticTextClass({
      favorability: m.favorability,
      hasComparison: true,
    })).toBe(sceSemanticIconClass("ERROR"));
  });

  it("maps ON_PLAN to neutral semantic text", () => {
    expect(varianceFavorabilityToFeedbackTone("ON_PLAN")).toBe("NEUTRAL");
    expect(financeVarianceComparisonSemanticTextClass({
      favorability: "ON_PLAN",
      hasComparison: true,
    })).toBe(sceSemanticIconClass("NEUTRAL"));
  });

  it("uses muted presentation when actual is missing (no comparison)", () => {
    const m = computeAccountVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      approvedBudgetMinor: 100_00,
      actualMinor: null,
    });
    expect(m.favorability).toBeNull();
    expect(financeVarianceComparisonSemanticTextClass({
      favorability: m.favorability,
      hasComparison: false,
    })).toBe("text-[var(--muted)]");
  });

  it("does not infer presentation from raw delta sign alone in the panel", () => {
    expect(panel).toContain("financeVarianceComparisonSemanticTextClass");
    expect(panel).toContain("financeVarianceFavorabilityLabelKey");
    expect(panel).not.toMatch(/rawDeltaMinor\s*[<>]=?\s*0/);
  });

  it("localizes favorability labels in DE without exposing internal enums", () => {
    expect(de).toContain('"favorabilityFavorable": "Günstig"');
    expect(de).toContain('"favorabilityUnfavorable": "Ungünstig"');
    expect(de).toContain('"favorabilityOnPlan": "Im Plan"');
    expect(panel).toContain("financeVarianceFavorabilityLabelKey");
    expect(panel).not.toContain('"FAVORABLE"');
    expect(panel).not.toContain('"UNFAVORABLE"');
    expect(panel).not.toContain('"ON_PLAN"');
  });

  it("provides favorability labels for all finance locales", () => {
    for (const blob of [en, fr, itLocale]) {
      expect(blob).toContain("favorabilityFavorable");
      expect(blob).toContain("favorabilityUnfavorable");
      expect(blob).toContain("favorabilityOnPlan");
    }
    expect(financeVarianceFavorabilityLabelKey("FAVORABLE")).toBe("favorabilityFavorable");
  });

  it("applies shared semantic class to both Abweichung and Bewertung cells", () => {
    const varianceSection = panel.slice(panel.indexOf("function PeriodicComparisonSection"));
    expect(varianceSection).toContain("data-finance-variance-delta");
    expect(varianceSection).toContain("data-finance-variance-assessment");
    expect(varianceSection.match(/varianceSemanticClass/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
