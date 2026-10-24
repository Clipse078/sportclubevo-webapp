import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const surfaces = readFileSync(
  join(process.cwd(), "lib/finance/finance-workspace-surfaces.ts"),
  "utf8",
);
const dialog = readFileSync(join(process.cwd(), "components/ui/Dialog.tsx"), "utf8");
const responsiveLayout = readFileSync(
  join(process.cwd(), "lib/shell/responsive-layout.ts"),
  "utf8",
);
const rolling = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastRollingUxSections.tsx"),
  "utf8",
);

describe("FIN-04C-06R1 reforecast dialog viewport accessibility", () => {
  it("A — dialog shell is viewport-bounded with flex column overflow containment", () => {
    expect(responsiveLayout).toMatch(
      /SCE_DIALOG_PANEL_BASE[\s\S]*max-h-\[var\(--sce-dialog-max-height\)\]/,
    );
    expect(responsiveLayout).toMatch(/SCE_DIALOG_PANEL_BASE[\s\S]*overflow-hidden/);
    expect(responsiveLayout).toMatch(/SCE_DIALOG_PANEL_BASE[\s\S]*min-h-0/);
    expect(dialog).toContain("SCE_DIALOG_PANEL_BASE");
    expect(dialog).toContain("SCE_DIALOG_FOOTER");
    expect(dialog).toContain("SCE_DIALOG_HEADER");
  });

  it("B — body can scroll vertically when content exceeds available height", () => {
    expect(surfaces).toContain("FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS");
    expect(surfaces).toMatch(/overflow-y-auto/);
    expect(surfaces).toMatch(/min-h-0 flex-auto/);
    expect(surfaces).not.toContain("md:overflow-visible");
  });

  it("C — footer remains outside scroll body (flex-none header/footer in shell)", () => {
    expect(responsiveLayout).toContain('export const SCE_DIALOG_FOOTER =');
    expect(responsiveLayout).toMatch(/SCE_DIALOG_FOOTER[\s\S]*shrink-0/);
    expect(responsiveLayout).toMatch(/SCE_DIALOG_HEADER[\s\S]*shrink-0/);
    expect(dialog).toMatch(/footer && <div className=\{cn\(SCE_DIALOG_FOOTER/);
  });

  it("D — desktop width does not disable vertical overflow protection", () => {
    expect(surfaces).not.toContain("md:flex-none");
    expect(surfaces).not.toContain("md:overflow-visible");
    expect(surfaces).not.toMatch(/max-md:max-h-\[min\(70dvh/);
  });

  it("E — expanded Weitere Angaben uses same dialog body scroll region", () => {
    expect(rolling).toContain("moreDetailsOpen");
    expect(rolling).toContain("bodyClassName={FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS}");
    expect(rolling).not.toMatch(/moreDetailsOpen[\s\S]*overflow-y-auto[\s\S]*moreDetailsOpen/);
  });

  it("F — no horizontal overflow on formal reforecast dialog body", () => {
    expect(surfaces).toMatch(/overflow-x-hidden/);
  });

  it("G — R4 preview lifecycle wiring unchanged", () => {
    expect(rolling).toContain("reduceFormalReforecastPreviewDialog");
    expect(rolling).toContain("isFormalReforecastSubmitEnabled");
    expect(rolling).not.toMatch(/onChange=\{\(e\) =>[\s\S]*requestPreview/);
  });

  it("H — FIN-04C-06 advanced fields remain progressive disclosure", () => {
    expect(rolling).toContain("moreDetailsOpen");
    expect(rolling).toContain("setMoreDetailsOpen");
    expect(rolling).toContain("revisionReason");
    expect(rolling).toContain("customActualsCutoff");
  });

  it("I — no new checkbox in reforecast dialog", () => {
    const dialogSection = rolling.slice(rolling.indexOf("export function FinanceFormalReforecastDialog"));
    expect(dialogSection).not.toMatch(/type="checkbox"/);
  });
});
