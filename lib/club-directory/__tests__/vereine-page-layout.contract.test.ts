import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VEREINE_PAGE_CONTENT_WIDTH_CLASS } from "../vereine-page-layout";

describe("vereine page layout contract", () => {
  it("shares max width between ListPagePattern and directory workspace", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/vereine/page.tsx"),
      "utf8",
    );
    const listSource = readFileSync(
      join(process.cwd(), "components/admin/club-directory/ClubDirectorySearchableList.tsx"),
      "utf8",
    );

    expect(VEREINE_PAGE_CONTENT_WIDTH_CLASS).toBe("max-w-6xl");
    expect(pageSource).toContain("VEREINE_PAGE_CONTENT_WIDTH_CLASS");
    expect(pageSource).toMatch(/ListPagePattern[\s\S]*VEREINE_PAGE_CONTENT_WIDTH_CLASS/);
    expect(listSource).not.toMatch(/\bmax-w-5xl\b/);
    expect(listSource).not.toMatch(/\bmx-auto\b/);
    expect(listSource).toContain('data-testid="vereine-directory-workspace"');
  });
});
