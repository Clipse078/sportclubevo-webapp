/**
 * SCE-TOURNAMENT-PLANNER-01E1 — tenant-organiser planner eligibility.
 */

import { describe, expect, it } from "vitest";
import {
  canTenantPlanTournament,
  normalizeTournamentOrganiserHomeAway,
  resolveTournamentPlannerOwnership,
} from "../planner-eligibility";

const TENANT = "FC Allschwil";

describe("Tournament Planner ownership — organiser not venue", () => {
  it("explicit HOME / tenant-organised allows planning", () => {
    expect(canTenantPlanTournament({ homeAway: "HOME" })).toBe(true);
    expect(resolveTournamentPlannerOwnership({ homeAway: "HOME" })).toBe("TENANT_ORGANISED");
  });

  it("explicit AWAY / externally organised forbids tenant planning", () => {
    expect(canTenantPlanTournament({ homeAway: "AWAY" })).toBe(false);
    expect(resolveTournamentPlannerOwnership({ homeAway: "AWAY" })).toBe("EXTERNALLY_ORGANISED");
  });

  it("rejects null/unknown homeAway without authoritative organiser proof", () => {
    expect(canTenantPlanTournament({ homeAway: null })).toBe(false);
    expect(canTenantPlanTournament({ homeAway: undefined })).toBe(false);
    expect(canTenantPlanTournament({ homeAway: "", organizerName: null, tenantName: TENANT })).toBe(
      false,
    );
    expect(resolveTournamentPlannerOwnership({ homeAway: null })).toBe("UNKNOWN");
  });

  it("allows null homeAway when organizerName matches tenant club name", () => {
    expect(
      canTenantPlanTournament({
        homeAway: null,
        organizerName: TENANT,
        tenantName: TENANT,
      }),
    ).toBe(true);
    expect(
      canTenantPlanTournament({
        homeAway: null,
        organizerName: "fc allschwil",
        tenantName: "FC Allschwil",
      }),
    ).toBe(true);
  });

  it("tenant-organised at external venue remains allowed (HOME organiser flag)", () => {
    expect(canTenantPlanTournament({ homeAway: "HOME" })).toBe(true);
  });

  it("externally-organised at tenant facility remains rejected (AWAY organiser flag)", () => {
    expect(canTenantPlanTournament({ homeAway: "AWAY" })).toBe(false);
  });

  it("presentation normaliser still maps null/unset to HOME for DTO layers only", () => {
    expect(normalizeTournamentOrganiserHomeAway(null)).toBe("HOME");
    expect(normalizeTournamentOrganiserHomeAway(undefined)).toBe("HOME");
  });
});
