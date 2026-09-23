import { describe, it, expect } from "vitest";
import {
  normalizeMatchHomeAway,
  resolveMatchPublicationDefaultsForCreate,
  resolveMatchPublicationDefaultsFromIsHome,
} from "../match-publication-defaults";

describe("match-publication-defaults", () => {
  it("HOME isHome → website, wochenplan, infoboard true", () => {
    expect(resolveMatchPublicationDefaultsFromIsHome(true)).toEqual({
      websiteVisible: true,
      infoboardVisible: true,
      wochenplanVisible: true,
    });
  });

  it("AWAY isHome=false → website true, wochenplan and infoboard false", () => {
    expect(resolveMatchPublicationDefaultsFromIsHome(false)).toEqual({
      websiteVisible: true,
      infoboardVisible: false,
      wochenplanVisible: false,
    });
  });

  it("manual HOME homeAway → wochenplan true", () => {
    expect(resolveMatchPublicationDefaultsForCreate("HOME").wochenplanVisible).toBe(true);
  });

  it("manual AWAY homeAway → wochenplan false", () => {
    expect(resolveMatchPublicationDefaultsForCreate("away").wochenplanVisible).toBe(false);
  });

  it("neutral/unknown homeAway → wochenplan false", () => {
    expect(resolveMatchPublicationDefaultsForCreate("NEUTRAL").wochenplanVisible).toBe(false);
    expect(resolveMatchPublicationDefaultsForCreate(null).wochenplanVisible).toBe(false);
  });

  it("normalizeMatchHomeAway trims and uppercases", () => {
    expect(normalizeMatchHomeAway(" home ")).toBe("HOME");
    expect(normalizeMatchHomeAway("Away")).toBe("AWAY");
    expect(normalizeMatchHomeAway("")).toBe(null);
  });
});
