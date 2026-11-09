import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCE_DS2_WHITE_EDITION } from "@/lib/design-system/sce-foundation-contract";
import {
  resolveSportClubEvoPlatformWordmarkForSurface,
  resolveSportClubEvoPlatformWordmarkForTheme,
  SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC,
  SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC,
} from "@/lib/branding/sportclubevo-platform-wordmark";

describe("SportClubEvo platform wordmark (theme-aware)", () => {
  it("uses dark lettering on light surfaces and light lettering on dark chrome", () => {
    expect(resolveSportClubEvoPlatformWordmarkForTheme(undefined).src).toBe(
      SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC,
    );
    expect(resolveSportClubEvoPlatformWordmarkForTheme(null).src).toBe(
      SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC,
    );
    expect(resolveSportClubEvoPlatformWordmarkForTheme("").src).toBe(
      SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC,
    );
    expect(
      resolveSportClubEvoPlatformWordmarkForTheme(SCE_DS2_WHITE_EDITION.themeValue).src,
    ).toBe(SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC);
  });

  it("resolves explicit surface contracts", () => {
    expect(resolveSportClubEvoPlatformWordmarkForSurface("light").src).toBe(
      SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC,
    );
    expect(resolveSportClubEvoPlatformWordmarkForSurface("dark").src).toBe(
      SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC,
    );
  });

  it("wires SidebarPlatformBrand to both variants for CSS theme selection", () => {
    const source = readRepo("components/admin/branding/SidebarPlatformBrand.tsx");
    expect(source).toContain("SPORTCLUBEVO_WORDMARK_ON_LIGHT_SURFACE_SRC");
    expect(source).toContain("SPORTCLUBEVO_WORDMARK_ON_DARK_SURFACE_SRC");
    expect(source).toContain("sce-platform-wordmark--on-light-surface");
    expect(source).toContain("sce-platform-wordmark--on-dark-surface");
  });
});

function readRepo(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}
