import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_01_DOC_MARKERS,
  SCE_DS2_01_PACKAGE_KEY,
  SCE_DS2_01_WHITE_EDITION_FLAG_DEFAULT,
} from "@/lib/design-system/sce-ds2-01-meta";
import {
  SCE_DS2_WHITE_EDITION,
  SCE_FOUNDATION_SOURCE_OF_TRUTH,
} from "@/lib/design-system/sce-foundation-contract";
import {
  SCE_WHITE_EDITION_CONTRAST_PAIRS,
  sceWhiteEditionContrastMatrixPass,
} from "@/lib/design-system/sce-white-edition-contrast";
import {
  isSceWhiteEditionEnabled,
  sceWhiteEditionThemeDataAttributes,
} from "@/lib/design-system/sce-white-edition-flag";
import { SCE_FUNCTIONAL_PANEL_CLASS } from "@/lib/design-system/sce-functional-surface-styles";

const ROOT = process.cwd();

function readGlobalsCss(): string {
  return readFileSync(join(ROOT, "app/globals.css"), "utf8");
}

describe("SCE-DS2-01 white foundation", () => {
  it("documents the package and white theme hook in globals.css", () => {
    const css = readGlobalsCss();
    expect(SCE_FOUNDATION_SOURCE_OF_TRUTH).toBe("app/globals.css");
    for (const marker of SCE_DS2_01_DOC_MARKERS) {
      if (marker.startsWith("docs/")) {
        expect(
          readFileSync(join(ROOT, marker), "utf8"),
        ).toContain(SCE_DS2_01_PACKAGE_KEY);
      } else {
        expect(css).toContain(marker);
      }
    }
    expect(css).toContain('[data-sce-theme="white"]');
    expect(css).toContain("--sce-color-text-primary");
  });

  it("keeps the white edition feature flag off by default", () => {
    expect(SCE_DS2_01_WHITE_EDITION_FLAG_DEFAULT).toBe(false);
    expect(
      isSceWhiteEditionEnabled({ SCE_WHITE_EDITION: undefined } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      isSceWhiteEditionEnabled({ SCE_WHITE_EDITION: "0" } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      isSceWhiteEditionEnabled({ SCE_WHITE_EDITION: "1" } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("exposes theme data attributes only when the flag is enabled", () => {
    const prev = process.env.SCE_WHITE_EDITION;
    process.env.SCE_WHITE_EDITION = "1";
    expect(sceWhiteEditionThemeDataAttributes()).toEqual({
      [SCE_DS2_WHITE_EDITION.themeDataAttribute]: SCE_DS2_WHITE_EDITION.themeValue,
    });
    process.env.SCE_WHITE_EDITION = "0";
    expect(sceWhiteEditionThemeDataAttributes()).toBeUndefined();
    if (prev === undefined) {
      delete process.env.SCE_WHITE_EDITION;
    } else {
      process.env.SCE_WHITE_EDITION = prev;
    }
  });

  it("passes the documented white-edition contrast matrix", () => {
    expect(SCE_WHITE_EDITION_CONTRAST_PAIRS.length).toBeGreaterThanOrEqual(5);
    const result = sceWhiteEditionContrastMatrixPass();
    expect(result.pass, JSON.stringify(result.failures)).toBe(true);
  });

  it("defines functional panel classes against semantic border tokens", () => {
    expect(SCE_FUNCTIONAL_PANEL_CLASS).toContain("var(--sce-color-border-standard)");
    expect(SCE_FUNCTIONAL_PANEL_CLASS).toContain("var(--sce-color-surface-standard)");
  });
});
