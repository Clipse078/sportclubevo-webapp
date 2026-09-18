/**
 * SPIELE-UX-01C — responsive composition contract (structural).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../../..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("SPIELE-UX-01C — responsive composition contract", () => {
  it("delays side-by-side main+rail until wide desktop breakpoint", () => {
    const workspace = readSource("components/admin/matchcenter/SpieleManagementWorkspace.tsx");
    const layout = readSource("components/admin/matchcenter/spiele-management-layout.ts");

    expect(layout).toContain("min-[105rem]:grid-cols-[minmax(0,1fr)_17.5rem]");
    expect(workspace).toContain("SPIELE_WORKSPACE_MAIN_RAIL_GRID");
    expect(workspace).not.toMatch(/xl:grid-cols-\[minmax\(0,1fr\)_17\.5rem\]/);
    expect(workspace).toContain('data-testid="spiele-management-rail"');
  });

  it("match rows use intermediate layout before wide desktop grid", () => {
    const row = readSource("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    expect(row).toContain("SPIELE_MATCH_ROW_INTERMEDIATE_GRID");
    expect(row).toContain("SPIELE_MATCH_ROW_WIDE_GRID");
    expect(row).not.toMatch(
      /md:grid-cols-\[4\.75rem_minmax\(0,1\.55fr\)_minmax\(0,9\.5rem\)/,
    );
  });

  it("away preparation does not repeat Auswärtsspiel heading", () => {
    const row = readSource("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    const prepBlock = row.slice(row.indexOf("if (isAway)"), row.indexOf("if (!isHome)"));
    expect(prepBlock).not.toContain("Auswärtsspiel");
  });

  it("home matchvorbereitung remains in row output", () => {
    const row = readSource("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    expect(row).toContain("Matchvorbereitung");
    expect(row).toContain("buildHomeReadinessChecklist");
  });

  it("right rail components remain mounted in workspace", () => {
    const workspace = readSource("components/admin/matchcenter/SpieleManagementWorkspace.tsx");
    expect(workspace).toContain("SpieleManagementMonthCalendar");
    expect(workspace).toContain("SpieleManagementSchnellfilter");
  });
});
