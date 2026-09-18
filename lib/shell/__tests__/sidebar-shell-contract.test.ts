/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applyShellLayoutVarsToDocument,
  resolveEffectiveSidebarWidthPx,
  SCE_MOBILE_SHELL_MAX_WIDTH_PX,
  SIDEBAR_COLLAPSED_WIDTH_PX,
} from "@/lib/shell/shell-layout-vars";
import {
  resolveModalApplicationLeftInsetPx,
  resolvePersistentSidebarWidthPx,
  resolveSidebarShellMode,
  SCE_SHELL_CONTRACT_VIEWPORTS_PX,
} from "@/lib/shell/sidebar-shell-contract";
import { SIDEBAR_WIDTH_DEFAULT, SIDEBAR_WIDTH_MAX } from "@/lib/shell/sidebar-width";

function readGlobalsCss(): string {
  return readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
}

describe("sidebar shell contract SCE-RESPONSIVE-01L", () => {
  beforeEach(() => {
    document.documentElement.style.cssText = "";
    document.documentElement.removeAttribute("data-sidebar-collapsed");
  });

  afterEach(() => {
    document.documentElement.style.cssText = "";
  });

  it("CSS derives effective width — JS must not inline --sce-sidebar-effective-width on desktop", () => {
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: 280,
      collapsed: false,
      viewportWidthPx: 1366,
    });
    expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("280px");
    expect(
      document.documentElement.style.getPropertyValue("--sce-sidebar-effective-width"),
    ).toBe("");
  });

  it("mobile viewport clears inline sidebar tokens so CSS zero inset applies", () => {
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: SIDEBAR_WIDTH_MAX,
      collapsed: false,
      viewportWidthPx: 1366,
    });
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: SIDEBAR_WIDTH_MAX,
      collapsed: false,
      viewportWidthPx: 390,
    });
    expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("");
    expect(
      document.documentElement.style.getPropertyValue("--sce-sidebar-effective-width"),
    ).toBe("");
  });

  it.each(SCE_SHELL_CONTRACT_VIEWPORTS_PX)(
    "viewport %ipx — modal inset matches persistent visible sidebar width",
    (viewportWidthPx) => {
      for (const collapsed of [false, true] as const) {
        const snapshot = {
          sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
          collapsed,
          viewportWidthPx,
        };
        const inset = resolveModalApplicationLeftInsetPx(snapshot);
        const persistent = resolvePersistentSidebarWidthPx(snapshot);
        expect(inset).toBe(persistent);

        if (viewportWidthPx <= SCE_MOBILE_SHELL_MAX_WIDTH_PX) {
          expect(inset).toBe(0);
        } else if (collapsed) {
          expect(inset).toBe(SIDEBAR_COLLAPSED_WIDTH_PX);
        } else {
          expect(inset).toBe(SIDEBAR_WIDTH_DEFAULT);
        }
      }
    },
  );

  it("sidebar mode matrix matches breakpoint intent", () => {
    expect(
      resolveSidebarShellMode({
        sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
        collapsed: false,
        viewportWidthPx: 768,
      }),
    ).toBe("mobile-off-canvas");
    expect(
      resolveSidebarShellMode({
        sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
        collapsed: false,
        viewportWidthPx: 769,
      }),
    ).toBe("expanded");
  });

  it("globals.css keeps single effective-width derivation path", () => {
    const css = readGlobalsCss();
    expect(css).toContain("--sce-sidebar-effective-width: var(--sidebar-width)");
    expect(css).toMatch(
      /html\[data-sidebar-collapsed="1"\][\s\S]*--sce-sidebar-effective-width:\s*var\(--sidebar-collapsed-width\)/,
    );
    expect(css).toMatch(
      /@media \(max-width: 768px\)[\s\S]*--sce-sidebar-effective-width:\s*0px/,
    );
  });

  it("resolveEffectiveSidebarWidthPx matches modal inset helper", () => {
    const snapshot = {
      sidebarWidthPx: 300,
      collapsed: true,
      viewportWidthPx: 1280,
    };
    expect(resolveEffectiveSidebarWidthPx(snapshot)).toBe(
      resolveModalApplicationLeftInsetPx(snapshot),
    );
  });
});
