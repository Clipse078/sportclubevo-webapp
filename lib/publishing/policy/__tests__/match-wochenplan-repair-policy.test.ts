import { describe, it, expect } from "vitest";
import { evaluateSfvHomeWochenplanRepair } from "../match-wochenplan-repair-policy";

const sfvMatch = {
  type: "MATCH",
  source: "SFV",
} as const;

describe("evaluateSfvHomeWochenplanRepair", () => {
  it("enables repair for HOME SFV match with canonical PUB-02 bundle but wochenplan off", () => {
    expect(
      evaluateSfvHomeWochenplanRepair({
        ...sfvMatch,
        homeAway: "HOME",
        wochenplanVisible: false,
        infoboardVisible: true,
      }),
    ).toEqual({ eligible: true, reason: "ELIGIBLE_BROKEN_HOME_DEFAULT" });
  });

  it("does not change AWAY matches", () => {
    expect(
      evaluateSfvHomeWochenplanRepair({
        ...sfvMatch,
        homeAway: "AWAY",
        wochenplanVisible: false,
        infoboardVisible: false,
      }),
    ).toEqual({ eligible: false, reason: "AWAY_UNCHANGED" });
  });

  it("skips AWAY with wochenplan on (manual override)", () => {
    expect(
      evaluateSfvHomeWochenplanRepair({
        ...sfvMatch,
        homeAway: "AWAY",
        wochenplanVisible: true,
        infoboardVisible: false,
      }).reason,
    ).toBe("AWAY_WOCHENPLAN_ON_MANUAL_OVERRIDE");
  });

  it("skips HOME with infoboard off (potential manual)", () => {
    expect(
      evaluateSfvHomeWochenplanRepair({
        ...sfvMatch,
        homeAway: "HOME",
        wochenplanVisible: false,
        infoboardVisible: false,
      }).reason,
    ).toBe("HOME_INFOBOARD_OFF_POTENTIAL_MANUAL");
  });
});
