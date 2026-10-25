import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const timingPage = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/forecast/timing/page.tsx"),
  "utf8",
);
const timingPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceForecastTimingWorkspacePanel.tsx"),
  "utf8",
);
const eventDialog = readFileSync(
  join(process.cwd(), "components/admin/finance/timing/FinanceExpectedFinancialEventDialog.tsx"),
  "utf8",
);
const timingActions = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/forecast/timing/actions.ts"),
  "utf8",
);
const subTabConfig = readFileSync(
  join(process.cwd(), "lib/finance/finance-forecast-sub-tab-config.ts"),
  "utf8",
);
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

describe("FIN-04E-05 forecast timing workspace UX", () => {
  it("A. navigation — timing route within forecast sub-tabs", () => {
    expect(subTabConfig).toContain("/dashboard/finance/forecast/timing");
    expect(timingPage).toContain("loadFinanceForecastTimingOverview");
    expect(timingPage).toContain("FinanceForecastTimingWorkspacePanel");
    expect(de).toContain('"timing": "Zeitplanung"');
  });

  it("B. hierarchy — summary before upcoming and attention", () => {
    const summaryIdx = timingPanel.indexOf('data-finance-timing-summary');
    const upcomingIdx = timingPanel.indexOf('data-finance-timing-upcoming');
    const attentionIdx = timingPanel.indexOf('data-finance-timing-attention');
    expect(summaryIdx).toBeGreaterThan(-1);
    expect(upcomingIdx).toBeGreaterThan(summaryIdx);
    expect(attentionIdx).toBeGreaterThan(upcomingIdx);
  });

  it("C. no liquidity curve, monthly phasing, or scenario controls on timing page", () => {
    expect(timingPanel).not.toContain("FinanceForecastEvolutionChart");
    expect(timingPanel).not.toContain("liquidity");
    expect(timingPanel).not.toContain("Ab Datum");
    expect(timingPanel).not.toContain("/ 12");
    expect(timingPanel).toContain("FinanceForecastTimingMovementTimeline");
  });

  it("D. modal-first create with segmented timing precision (no checkboxes)", () => {
    expect(eventDialog).toContain("<Dialog");
    expect(eventDialog).toContain("SceSegmentedControl");
    expect(eventDialog).not.toMatch(/type="checkbox"/);
    expect(eventDialog).toContain("createFinanceExpectedEventAction");
    expect(eventDialog).toContain("updateFinanceExpectedEventAction");
  });

  it("E. server actions wrap 04E-03 services without domain duplication", () => {
    expect(timingActions).toContain("createFinanceExpectedFinancialEvent");
    expect(timingActions).toContain("updateFinanceExpectedFinancialEvent");
    expect(timingActions).toContain("deleteFinanceExpectedFinancialEvent");
    expect(timingActions).not.toContain("reconcileExpectedFinancialTiming");
  });

  it("F. progressive disclosure for all events and balanced accounts", () => {
    expect(timingPanel).toContain("FinanceWorkspaceDisclosure");
    expect(timingPanel).toContain('data-finance-disclosure="timing-all-events"');
    expect(timingPanel).toContain('data-finance-disclosure="timing-balanced-accounts"');
  });

  it("G. responsive structure — min-w-0 overflow guard on maintenance table", () => {
    expect(timingPanel).toContain("min-w-0 overflow-x-auto");
  });

  it("H. tenant terminology — no internal reconciliation jargon in default copy keys", () => {
    expect(de).toContain("Noch nicht terminiert");
    expect(de).not.toContain("Unscheduled Remainder");
    expect(de).not.toContain("AMBIGUOUS_AT_CUTOFF");
    expect(timingPanel).not.toContain("Reconciliation");
    expect(timingPanel).not.toContain("AMBIGUOUS_AT_CUTOFF");
  });

  it("I. permissions — mutation gated by canMutate", () => {
    expect(timingPanel).toContain("canMutate");
    expect(timingPage).toContain("canForecastManage");
  });

  it("J. stale error mapping in dialog", () => {
    expect(eventDialog).toContain("FINANCE_EXPECTED_EVENT_STALE");
    expect(de).toContain("Dieser Eintrag wurde inzwischen geändert");
  });
});
