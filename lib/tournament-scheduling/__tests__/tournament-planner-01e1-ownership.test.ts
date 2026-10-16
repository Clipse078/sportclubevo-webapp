/**
 * SCE-TOURNAMENT-PLANNER-01E1 — tenant-organiser planner eligibility.
 */

import { describe, expect, it } from "vitest";
import {
  canTenantPlanTournament,
  normalizeTournamentOrganiserHomeAway,
} from "../planner-eligibility";

describe("Tournament Planner ownership — organiser not venue", () => {
  it("tenant-organised (HOME) tournaments allow planning", () => {
    expect(canTenantPlanTournament({ homeAway: "HOME" })).toBe(true);
  });

  it("externally-organised (AWAY) tournaments forbid tenant planning", () => {
    expect(canTenantPlanTournament({ homeAway: "AWAY" })).toBe(false);
  });

  it("normalises null/unset homeAway to tenant-organised HOME", () => {
    expect(normalizeTournamentOrganiserHomeAway(null)).toBe("HOME");
    expect(normalizeTournamentOrganiserHomeAway(undefined)).toBe("HOME");
  });

});
