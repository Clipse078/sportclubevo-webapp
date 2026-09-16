/**
 * WOCHENPLAN-2.0-01C — focused tests for public Wochenplan publication policy.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateWochenplanMatchPublication,
  evaluateWochenplanTournamentPublication,
  evaluateWochenplanTrainingPublication,
} from "../publication-policy";
import { evaluateHomeMatchLocation } from "@/lib/publishing/policy/publication-policy";

const TENANT = "tenant-fca";

describe("evaluateHomeMatchLocation (shared with Infoboard)", () => {
  it("accepts HOME matches", () => {
    expect(evaluateHomeMatchLocation("HOME")).toEqual({ eligible: true, reason: "ELIGIBLE" });
  });

  it("rejects AWAY matches", () => {
    expect(evaluateHomeMatchLocation("AWAY")).toEqual({ eligible: false, reason: "AWAY_MATCH" });
  });
});

describe("evaluateWochenplanMatchPublication", () => {
  const base = {
    tenantId: TENANT,
    type: "MATCH",
    status: "SCHEDULED",
    infoboardVisible: true,
    websiteVisible: true,
    trainingsplanVisible: false,
    homeAway: "HOME",
  };

  it("includes home match when websiteVisible", () => {
    expect(evaluateWochenplanMatchPublication(base, TENANT).eligible).toBe(true);
  });

  it("excludes away match", () => {
    expect(
      evaluateWochenplanMatchPublication({ ...base, homeAway: "AWAY" }, TENANT).reason,
    ).toBe("AWAY_MATCH");
  });

  it("excludes hidden website match", () => {
    expect(
      evaluateWochenplanMatchPublication({ ...base, websiteVisible: false }, TENANT).reason,
    ).toBe("WEBSITE_HIDDEN");
  });

  it("excludes match when wochenplanVisible is false", () => {
    expect(
      evaluateWochenplanMatchPublication({ ...base, wochenplanVisible: false }, TENANT).reason,
    ).toBe("WOCHENPLAN_HIDDEN");
  });
});

describe("evaluateWochenplanTournamentPublication", () => {
  const base = {
    tenantId: TENANT,
    type: "TOURNAMENT",
    status: "SCHEDULED",
    infoboardVisible: true,
    websiteVisible: true,
    trainingsplanVisible: false,
    homeAway: "HOME",
  };

  it("includes home tournament", () => {
    expect(evaluateWochenplanTournamentPublication(base, TENANT).eligible).toBe(true);
  });

  it("excludes external/away tournament", () => {
    expect(
      evaluateWochenplanTournamentPublication({ ...base, homeAway: "AWAY" }, TENANT).reason,
    ).toBe("AWAY_MATCH");
  });

  it("excludes tournament when wochenplanVisible is false", () => {
    expect(
      evaluateWochenplanTournamentPublication({ ...base, wochenplanVisible: false }, TENANT)
        .reason,
    ).toBe("WOCHENPLAN_HIDDEN");
  });

  it("includes tournament when wochenplanVisible is true", () => {
    expect(
      evaluateWochenplanTournamentPublication({ ...base, wochenplanVisible: true }, TENANT).eligible,
    ).toBe(true);
  });

  it("excludes tournament when websiteVisible is false even if wochenplanVisible is true", () => {
    expect(
      evaluateWochenplanTournamentPublication(
        { ...base, websiteVisible: false, wochenplanVisible: true },
        TENANT,
      ).reason,
    ).toBe("WEBSITE_HIDDEN");
  });
});

describe("evaluateWochenplanTrainingPublication", () => {
  it("includes scheduled training", () => {
    expect(evaluateWochenplanTrainingPublication(TENANT, TENANT, "SCHEDULED").eligible).toBe(true);
  });

  it("excludes cancelled training", () => {
    expect(evaluateWochenplanTrainingPublication(TENANT, TENANT, "CANCELLED").eligible).toBe(false);
  });

  it("enforces tenant isolation", () => {
    expect(evaluateWochenplanTrainingPublication(TENANT, "other", "SCHEDULED").reason).toBe(
      "TENANT_MISMATCH",
    );
  });
});
