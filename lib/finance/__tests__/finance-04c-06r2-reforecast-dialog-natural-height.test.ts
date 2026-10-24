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
const disclosure = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceWorkspaceDisclosure.tsx"),
  "utf8",
);

describe("FIN-04C-06R2 formal reforecast dialog natural height", () => {
  it("A — default desktop uses content-sized shell, not permanent flex scroll band", () => {
    expect(surfaces).toContain("FINANCE_FORMAL_REFORECAST_DIALOG_SHELL_CLASS");
    expect(surfaces).toMatch(/h-auto self-center/);
    expect(rolling).toContain("panelClassName={FINANCE_FORMAL_REFORECAST_DIALOG_SHELL_CLASS}");
    expect(surfaces).toMatch(/flex-auto/);
    expect(surfaces).not.toMatch(
      /FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS[\s\S]*flex-1/,
    );
  });

  it("B — constrained height retains viewport cap and body overflow fallback", () => {
    expect(responsiveLayout).toMatch(
      /SCE_DIALOG_PANEL_BASE[\s\S]*max-h-\[var\(--sce-dialog-max-height\)\]/,
    );
    expect(responsiveLayout).toMatch(/SCE_DIALOG_PANEL_BASE[\s\S]*overflow-hidden/);
    expect(surfaces).toMatch(/overflow-y-auto/);
    expect(surfaces).toMatch(/min-h-0/);
  });

  it("C — header and footer stay outside scrolling body", () => {
    expect(responsiveLayout).toMatch(/SCE_DIALOG_FOOTER[\s\S]*shrink-0/);
    expect(responsiveLayout).toMatch(/SCE_DIALOG_HEADER[\s\S]*shrink-0/);
    expect(dialog).toMatch(/footer && <div className=\{cn\(SCE_DIALOG_FOOTER/);
    expect(rolling).toContain("bodyClassName={FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS}");
  });

  it("D — expanded Weitere Angaben uses same body scroll region", () => {
    expect(rolling).toContain("moreDetailsOpen");
    expect(rolling).toContain("data-finance-disclosure-panel");
  });

  it("E — mobile shell retains single scroll region architecture", () => {
    expect(dialog).toContain("SCE_DIALOG_MOBILE_VIEWPORT_SHELL");
    expect(dialog).toContain("max-md:h-[100dvh]");
    expect(surfaces).toMatch(/overflow-x-hidden/);
  });

  it("F — disclosure is canonical interactive control", () => {
    expect(rolling).toContain("data-finance-disclosure=\"formal-reforecast-more-details\"");
    expect(rolling).toContain("data-finance-disclosure-trigger");
    expect(rolling).toContain("ChevronDown");
    expect(rolling).toContain("aria-expanded={moreDetailsOpen}");
    expect(rolling).toContain("formalReforecast.moreDetailsTitle");
    expect(disclosure).toContain("aria-expanded");
    const dialogSection = rolling.slice(
      rolling.indexOf("export function FinanceFormalReforecastDialog"),
    );
    expect(dialogSection).not.toMatch(/type="checkbox"/);
  });

  it("G — compact preview surface without oversized summary card", () => {
    expect(surfaces).toContain("FINANCE_FORMAL_REFORECAST_PREVIEW_CLASS");
    expect(rolling).toContain("FINANCE_FORMAL_REFORECAST_PREVIEW_CLASS");
    expect(rolling).not.toContain("FINANCE_SUMMARY_STRIP_SURFACE_CLASS");
  });

  it("H — R4 preview lifecycle wiring unchanged", () => {
    expect(rolling).toContain("reduceFormalReforecastPreviewDialog");
    expect(rolling).toContain("isFormalReforecastSubmitEnabled");
    expect(rolling).not.toMatch(/onChange=\{\(e\) =>[\s\S]*requestPreview/);
  });
});
