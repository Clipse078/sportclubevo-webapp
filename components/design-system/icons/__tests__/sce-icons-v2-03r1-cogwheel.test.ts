/**
 * SCE-ICONS-V2-03R1 — administration classic cogwheel optical correction.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SettingsApprovedMasterGlyph } from "../masters/approved-platform-master-glyphs";
import { SCE_APPROVED_MASTER_ASSETS } from "../masters/approved-hero-meta";
import { NAV_DESTINATION_SCE_ICON_BY_KEY } from "@/lib/nav/nav-destination-sce-icons";
import { SCE_V2_V1_GEOMETRY_OPTICAL_EXCEPTIONS } from "@/lib/icons/v1-master-geometry-equivalence";

export const SCE_SETTINGS_VISUAL_CONCEPT = "classic_cogwheel" as const;

describe("SCE-ICONS-V2-03R1 administration cogwheel", () => {
  it("documents the single approved V1 geometry optical exception", () => {
    expect(SCE_V2_V1_GEOMETRY_OPTICAL_EXCEPTIONS).toEqual({
      settings: "PRODUCT_OWNER_APPROVED_V2_OPTICAL_EXCEPTION",
    });
  });

  it("uses classic cogwheel geometry in the canonical settings master", () => {
    const settingsSvg = readFileSync(
      join(process.cwd(), SCE_APPROVED_MASTER_ASSETS.settings),
      "utf8",
    );
    expect(SCE_SETTINGS_VISUAL_CONCEPT).toBe("classic_cogwheel");
    expect(settingsSvg).toContain('viewBox="0 0 64 64"');
    expect(settingsSvg).toMatch(/<path d="M32 16L/);
    expect(settingsSvg).toMatch(/<circle cx="32" cy="32" r="8"/);
    expect(settingsSvg).not.toMatch(/stroke-dasharray/);
  });

  it("maps administration destinations to settings without widening utility configuration", () => {
    expect(NAV_DESTINATION_SCE_ICON_BY_KEY.administration).toBe("settings");
    expect(NAV_DESTINATION_SCE_ICON_BY_KEY["admin-branding"]).toBe("settings");
    expect(NAV_DESTINATION_SCE_ICON_BY_KEY["website-settings"]).toBe("settings");
    expect(NAV_DESTINATION_SCE_ICON_BY_KEY["platform-commercial-billing-settings"]).toBe(
      "settings",
    );
    expect(SettingsApprovedMasterGlyph.name).toBe("SettingsApprovedMasterGlyph");
  });
});
