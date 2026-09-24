/**
 * PLANNING-UX-05R2 — explicit regression guard: SFV HOME Wochenplan defaults
 * must remain unchanged by planning UI refactors (HOTFIX-WOCHENPLAN-01 policy).
 */

import { describe, it, expect } from "vitest";
import { resolveMatchPublicationDefaultsForCreate } from "@/lib/publishing/policy/match-publication-defaults";
import { evaluateSfvHomeWochenplanRepair } from "@/lib/publishing/policy/match-wochenplan-repair-policy";

describe("PLANNING-UX-05R2 SFV HOME Wochenplan regression", () => {
  it("HOME match create defaults keep wochenplanVisible true", () => {
    expect(resolveMatchPublicationDefaultsForCreate("HOME").wochenplanVisible).toBe(true);
  });

  it("AWAY match create defaults keep wochenplanVisible false", () => {
    expect(resolveMatchPublicationDefaultsForCreate("AWAY").wochenplanVisible).toBe(false);
  });

  it("SFV HOME repair still eligible when wochenplan off with infoboard on", () => {
    const decision = evaluateSfvHomeWochenplanRepair({
      type: "MATCH",
      source: "SFV",
      homeAway: "HOME",
      wochenplanVisible: false,
      infoboardVisible: true,
    });
    expect(decision.eligible).toBe(true);
  });
});
