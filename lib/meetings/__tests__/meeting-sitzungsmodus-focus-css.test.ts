import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural guard: focus chrome must not hide the workspace main landmark.
 * jsdom cannot prove computed layout; this asserts the authored selector shape.
 */
describe("Sitzungsmodus focus shell CSS", () => {
  it("hides detail chrome siblings only, not sce-workspace-chrome root or main", () => {
    const css = readFileSync(join(process.cwd(), "app/(admin)/authenticated-shell.css"), "utf8");
    expect(css).not.toMatch(
      /\[data-sce-workspace-chrome\]\s*\{[^}]*display:\s*none/,
    );
    expect(css).toContain(
      "[data-meeting-detail-outer-chrome] [data-sce-workspace-chrome] > :not(main)",
    );
    expect(css).toContain("display: none !important");
  });

  it("meeting detail page scopes workspace title sr-only, not focus headings", () => {
    const page = readFileSync(
      join(process.cwd(), "app/(admin)/vereinsleitung/meetings/[slug]/page.tsx"),
      "utf8",
    );
    expect(page).toContain("[&_[data-meeting-workspace-detail-header]_h1]:sr-only");
    expect(page).not.toMatch(/\[&_h1\]:sr-only/);
  });
});