import { describe, expect, it } from "vitest";
import {
  KIOSK_SHELL_FOOTER_AMBIENT,
  KIOSK_SHELL_HEADER_AMBIENT,
  KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY,
  resolveKioskHeaderWelcomeSubtitle,
  resolveKioskShellThemePresentation,
  resolveVenueHeaderBrandingInput,
} from "@/lib/infoboard/kiosk-shell-presentation";

describe("kiosk-shell-presentation", () => {
  it("maps LIGHT/DARK themes to shell presentation tokens", () => {
    expect(resolveKioskShellThemePresentation("LIGHT")).toEqual({
      shellTheme: "light",
      venueDisplayLight: true,
      subtitlePlacement: "header-inline",
    });
    expect(resolveKioskShellThemePresentation("DARK")).toEqual({
      shellTheme: "dark",
      venueDisplayLight: false,
      subtitlePlacement: "band",
    });
  });

  it("keeps tenant header branding data-driven", () => {
    expect(
      resolveVenueHeaderBrandingInput({
        tenantPrimaryColor: "#112233",
        tenantSecondaryColor: "#445566",
      }),
    ).toEqual({
      tenantPrimaryColor: "#112233",
      tenantSecondaryColor: "#445566",
    });
  });

  it("uppercases dark welcome subtitles and softens light inline welcome", () => {
    expect(resolveKioskHeaderWelcomeSubtitle("Willkommen", "DARK")).toBe("WILLKOMMEN");
    expect(resolveKioskHeaderWelcomeSubtitle("Willkommen auf der Anlage", "LIGHT")).toBe(
      "Willkommen auf der Anlage",
    );
  });

  it("exports canonical ambient and tenant typography contracts", () => {
    expect(KIOSK_SHELL_HEADER_AMBIENT).toEqual({ venueHeaderAmbient: true });
    expect(KIOSK_SHELL_FOOTER_AMBIENT).toEqual({ jumbotronAmbient: true });
    expect(KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontWeight).toBe(800);
    expect(KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontStyle).toBe("italic");
    expect(KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontFamily).toContain("--font-display");
  });
});
