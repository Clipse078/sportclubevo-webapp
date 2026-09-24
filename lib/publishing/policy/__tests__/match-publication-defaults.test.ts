import { describe, it, expect } from "vitest";
import {
  normalizeMatchHomeAway,
  resolveMatchPublicationDefaultsForCreate,
  resolveMatchPublicationDefaultsFromIsHome,
} from "../match-publication-defaults";

describe("match-publication-defaults", () => {
  it("HOME isHome → all five applicable channels true", () => {
    expect(resolveMatchPublicationDefaultsFromIsHome(true)).toEqual({
      websiteVisible: true,
      infoboardVisible: true,
      wochenplanVisible: true,
      homepageVisible: true,
      teamPageVisible: true,
    });
  });

  it("AWAY isHome=false → website, homepage, team page true; wochenplan and infoboard false", () => {
    expect(resolveMatchPublicationDefaultsFromIsHome(false)).toEqual({
      websiteVisible: true,
      infoboardVisible: false,
      wochenplanVisible: false,
      homepageVisible: true,
      teamPageVisible: true,
    });
  });

  it("manual HOME homeAway → wochenplan true", () => {
    expect(resolveMatchPublicationDefaultsForCreate("HOME").wochenplanVisible).toBe(true);
  });

  it("manual AWAY homeAway → wochenplan false", () => {
    expect(resolveMatchPublicationDefaultsForCreate("away").wochenplanVisible).toBe(false);
  });

  it("manual HOME homeAway → all five ON", () => {
    expect(resolveMatchPublicationDefaultsForCreate("HOME")).toEqual({
      websiteVisible: true,
      infoboardVisible: true,
      wochenplanVisible: true,
      homepageVisible: true,
      teamPageVisible: true,
    });
  });

  it("manual AWAY homeAway → applicable AWAY defaults", () => {
    expect(resolveMatchPublicationDefaultsForCreate("AWAY")).toEqual({
      websiteVisible: true,
      infoboardVisible: false,
      wochenplanVisible: false,
      homepageVisible: true,
      teamPageVisible: true,
    });
  });

  it("neutral/unknown homeAway → wochenplan and infoboard false, website/homepage/team page true", () => {
    const neutral = {
      websiteVisible: true,
      infoboardVisible: false,
      wochenplanVisible: false,
      homepageVisible: true,
      teamPageVisible: true,
    };
    expect(resolveMatchPublicationDefaultsForCreate("NEUTRAL")).toEqual(neutral);
    expect(resolveMatchPublicationDefaultsForCreate(null)).toEqual(neutral);
  });

  it("normalizeMatchHomeAway trims and uppercases", () => {
    expect(normalizeMatchHomeAway(" home ")).toBe("HOME");
    expect(normalizeMatchHomeAway("Away")).toBe("AWAY");
    expect(normalizeMatchHomeAway("")).toBe(null);
  });
});
