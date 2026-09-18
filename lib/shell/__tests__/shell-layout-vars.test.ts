/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  applyShellLayoutVarsToDocument,
  resolveEffectiveSidebarWidthPx,
  SIDEBAR_COLLAPSED_WIDTH_PX,
} from "@/lib/shell/shell-layout-vars";
import { SIDEBAR_WIDTH_DEFAULT } from "@/lib/shell/sidebar-width";

describe("shell-layout-vars", () => {
  it("resolveEffectiveSidebarWidthPx — expanded, collapsed, mobile", () => {
    expect(
      resolveEffectiveSidebarWidthPx({
        sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
        collapsed: false,
        viewportWidthPx: 1536,
      }),
    ).toBe(SIDEBAR_WIDTH_DEFAULT);

    expect(
      resolveEffectiveSidebarWidthPx({
        sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
        collapsed: true,
        viewportWidthPx: 1536,
      }),
    ).toBe(SIDEBAR_COLLAPSED_WIDTH_PX);

    expect(
      resolveEffectiveSidebarWidthPx({
        sidebarWidthPx: SIDEBAR_WIDTH_DEFAULT,
        collapsed: false,
        viewportWidthPx: 768,
      }),
    ).toBe(0);
  });

  it("applyShellLayoutVarsToDocument sets persisted width only (effective from CSS)", () => {
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: 300,
      collapsed: false,
      viewportWidthPx: 1440,
    });
    expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe(
      "300px",
    );
    expect(
      document.documentElement.style.getPropertyValue("--sce-sidebar-effective-width"),
    ).toBe("");
  });

  it("applyShellLayoutVarsToDocument clears inline tokens on mobile shell", () => {
    applyShellLayoutVarsToDocument({
      sidebarWidthPx: 300,
      collapsed: false,
      viewportWidthPx: 640,
    });
    expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("");
  });
});
