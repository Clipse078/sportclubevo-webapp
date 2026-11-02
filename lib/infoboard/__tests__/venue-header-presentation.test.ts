import { describe, expect, it } from "vitest";
import {
  resolveVenueHeaderCssVars,
  resolveVenueHeaderPresentationTokens,
  VENUE_HEADER_PLATFORM_PRIMARY,
} from "@/lib/infoboard/venue-header-presentation";

describe("venue header presentation tokens", () => {
  it("falls back to platform primary when tenant colours are absent", () => {
    const tokens = resolveVenueHeaderPresentationTokens(null);
    expect(tokens.tenantPrimary).toBe(VENUE_HEADER_PLATFORM_PRIMARY);
    expect(tokens.tenantSecondary).toBeNull();
  });

  it("builds a two-stop accent when secondary exists", () => {
    const tokens = resolveVenueHeaderPresentationTokens({
      tenantPrimaryColor: "#001122",
      tenantSecondaryColor: "#AABBCC",
    });
    expect(tokens.accentGradient).toContain("#001122");
    expect(tokens.accentGradient).toContain("#AABBCC");
  });

  it("exposes semantic venue header CSS variables", () => {
    const vars = resolveVenueHeaderCssVars({
      tenantPrimaryColor: "#001122",
      tenantSecondaryColor: null,
    });
    expect(vars["--venue-tenant-primary"]).toBe("#001122");
    expect(vars["--venue-header-surface"]).toBe("#FFFFFF");
    expect(vars["--venue-header-text"]).toBeTruthy();
  });
});
