import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "components/admin/club-directory");

const FILES = [
  "ClubDirectorySearchableList.tsx",
  "ClubDirectoryRow.tsx",
  "ClubDirectoryFilterBar.tsx",
  "LogoUploadCard.tsx",
];

describe("VEREINE-UX-03 dark-surface contract (club directory UI)", () => {
  it("touched directory components avoid hardcoded light surfaces", () => {
    for (const file of FILES) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source).not.toMatch(/\bbg-white\b/);
      expect(source).not.toMatch(/\bbg-slate-50\b/);
      expect(source).not.toMatch(/\bbg-amber-100\b/);
    }
  });
});
