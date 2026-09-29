/**
 * SCE-SELECTOR-02 — prevent reintroduction of parallel generic entity pickers.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "components");

const FORBIDDEN_GENERIC_NAMES = [
  /^PersonPicker\.tsx$/,
  /^TeamPicker\.tsx$/,
  /^RolePicker\.tsx$/,
  /^OrgUnitPicker\.tsx$/,
  /^GenericEntityPicker\.tsx$/,
];

const ALLOWLIST_PATHS = [
  "components/shared/PeoplePicker.tsx",
  "components/sce/list-selector/",
  "components/admin/tournamentcenter/ExternalClubPicker.tsx",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("selector duplication guard", () => {
  it("does not add new forbidden generic picker components outside allowlist", () => {
    const files = walk(ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const rel = file.replace(`${process.cwd()}/`, "");
      if (ALLOWLIST_PATHS.some((prefix) => rel.startsWith(prefix) || rel === prefix)) {
        continue;
      }
      const base = rel.split("/").pop() ?? rel;
      if (FORBIDDEN_GENERIC_NAMES.some((pattern) => pattern.test(base))) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });

  it("PeoplePicker delegates generic mode to SCE inline picker", () => {
    const source = readFileSync(join(process.cwd(), "components/shared/PeoplePicker.tsx"), "utf8");
    expect(source).toContain("SceInlineSinglePersonPicker");
    expect(source).toContain('mode === "any" && !teamSeasonId');
  });
});
