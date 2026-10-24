import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectionSection = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceProjectionWorkspaceSection.tsx"),
  "utf8",
);
const forecastPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastWorkspacePanel.tsx"),
  "utf8",
);

describe("FIN-04B-05R1 projection intelligence dashboard UX", () => {
  it("shows first-use intro without coverage before generation", () => {
    expect(projectionSection).toContain("hasGeneratedVersion");
    expect(projectionSection).toContain("introBody");
    expect(projectionSection).toContain("if (!hasGeneratedVersion) return null");
  });

  it("embeds finance-native outlook and composition charts", () => {
    expect(projectionSection).toContain("FinanceProjectionOutlookChart");
    expect(projectionSection).toContain("FinanceProjectionCompositionChart");
    expect(projectionSection).toContain("data-finance-projection-visuals");
  });

  it("keeps SCE account detail separate from editable forecast table width", () => {
    expect(forecastPanel).toContain("FinanceProjectionAccountDetailSection");
    expect(forecastPanel).not.toContain("FinanceProjectionAccountCell");
    expect(forecastPanel).not.toContain("projectionColumn");
  });

  it("does not expose adoption actions", () => {
    expect(projectionSection).not.toMatch(/übernehmen|adopt/i);
    expect(forecastPanel).not.toMatch(/adoptProjection|projectionAdopt/i);
  });
});
