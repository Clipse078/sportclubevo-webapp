// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { SCE_DS2_WHITE_EDITION } from "@/lib/design-system/sce-foundation-contract";
import { resolveSceModalOverlayThemeAttribute } from "@/lib/ui/sce-modal-overlay-theme";

describe("resolveSceModalOverlayThemeAttribute", () => {
  it("returns null when authenticated shell has no theme", () => {
    document.body.innerHTML = `<div class="sce-authenticated-app-shell"></div>`;
    expect(resolveSceModalOverlayThemeAttribute()).toBeNull();
  });

  it("inherits data-sce-theme from authenticated shell", () => {
    document.body.innerHTML = `<div class="sce-authenticated-app-shell" data-sce-theme="white"></div>`;
    expect(resolveSceModalOverlayThemeAttribute()).toBe(SCE_DS2_WHITE_EDITION.themeValue);
  });
});
