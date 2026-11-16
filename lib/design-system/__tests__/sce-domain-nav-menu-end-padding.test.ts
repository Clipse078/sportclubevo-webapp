import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDomainNavMenuTokens } from "@/lib/nav/sce-domain-nav-menu-layout";

const css = readFileSync(
  join(process.cwd(), "app/(admin)/global-app-navigation.css"),
  "utf8",
);

describe("Mega-menu scrollport end padding", () => {
  it("applies ~32px token-based bottom padding on the shared cham frame", () => {
    expect(css).toContain("--sce-domain-nav-frame-pad-block-end: 2rem");
    const tokens = parseDomainNavMenuTokens(css);
    expect(tokens.padBlockEndPx).toBeGreaterThanOrEqual(30);
    expect(tokens.padBlockEndPx).toBeLessThanOrEqual(34);
  });
});