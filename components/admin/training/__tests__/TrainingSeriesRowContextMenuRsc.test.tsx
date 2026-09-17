/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../../..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("TRAININGS-UX-01J3 RSC boundary", () => {
  it("management row passes only serializable props into the context menu", () => {
    const rowSource = readSource("components/admin/training/TrainingSeriesManagementRow.tsx");
    const menuBlock = rowSource.slice(rowSource.indexOf("<TrainingSeriesRowContextMenu"));
    expect(rowSource).toContain("teamSeasonId={row.teamSeasonId}");
    expect(menuBlock).not.toContain("onComplete=");
    expect(menuBlock).not.toContain("onOpen=");
    expect(menuBlock).not.toMatch(/=\s*\([^)]*\)\s*=>/);
  });

  it("training page does not pass function props into TrainingManagementWorkspace", () => {
    const pageSource = readSource("app/(admin)/dashboard/training/page.tsx");
    expect(pageSource).not.toMatch(/canManage=\{[^}]*=>/);
    expect(pageSource).not.toMatch(/on[A-Z]\w+\s*=\s*\{/);
  });
});
