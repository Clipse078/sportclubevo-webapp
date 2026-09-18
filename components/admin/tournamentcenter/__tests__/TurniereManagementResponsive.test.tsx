/**
 * TURNIERE-UX-01 — responsive composition contract (structural).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../../..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("TURNIERE-UX-01 — responsive composition contract", () => {
  it("delays side-by-side main+rail until wide desktop breakpoint", () => {
    const workspace = readSource("components/admin/tournamentcenter/TournamentCenterWorkspace.tsx");
    const layout = readSource("components/admin/matchcenter/spiele-management-layout.ts");

    expect(layout).toContain("min-[105rem]:grid-cols-[minmax(0,1fr)_17.5rem]");
    expect(workspace).toContain("TURNIERE_WORKSPACE_MAIN_RAIL_GRID");
    expect(workspace).not.toMatch(/xl:grid-cols-\[minmax\(0,1fr\)_17\.5rem\]/);
    expect(workspace).toContain('data-testid="turniere-management-rail"');
  });

  it("tournament rows use intermediate layout before wide desktop grid", () => {
    const row = readSource("components/admin/tournamentcenter/TurniereManagementRow.tsx");
    expect(row).toContain("TURNIERE_ROW_INTERMEDIATE_GRID");
    expect(row).toContain("TURNIERE_ROW_WIDE_GRID");
  });

  it("right rail components remain mounted in workspace", () => {
    const workspace = readSource("components/admin/tournamentcenter/TournamentCenterWorkspace.tsx");
    expect(workspace).toContain("TurniereManagementMonthCalendar");
    expect(workspace).toContain("TurniereManagementQuickAccess");
    expect(workspace).toContain("TurniereManagementFilterRail");
  });
});
