import { describe, expect, it } from "vitest";
import {
  CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN,
  defaultClubStrategyOrgScopeSelection,
  parseClubStrategyOrgScopeSelection,
  parseCreateClubStrategyScopeInput,
  toCreateClubStrategyScopePayload,
} from "../club-strategy-org-scope";

describe("club-strategy-org-scope", () => {
  it("defaults to explicit Gesamtverein token", () => {
    expect(defaultClubStrategyOrgScopeSelection()).toEqual([CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN]);
  });

  it("parses empty selection as invalid", () => {
    expect(parseClubStrategyOrgScopeSelection([])).toEqual({ kind: "invalid" });
  });

  it("parses Gesamtverein token as club-wide", () => {
    expect(parseClubStrategyOrgScopeSelection([CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN])).toEqual({
      kind: "club_wide",
    });
  });

  it("rejects mixed Gesamtverein and org units", () => {
    expect(
      parseClubStrategyOrgScopeSelection([CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN, "org-a"]),
    ).toEqual({ kind: "invalid" });
  });

  it("builds create payload for club-wide and org units", () => {
    expect(toCreateClubStrategyScopePayload([CD_CLUB_STRATEGY_SCOPE_GESAMTVEREIN])).toEqual({
      scopeClubWide: true,
    });
    expect(toCreateClubStrategyScopePayload(["org-a", "org-b"])).toEqual({
      orgUnitIds: ["org-a", "org-b"],
    });
    expect(toCreateClubStrategyScopePayload([])).toBeNull();
  });

  it("rejects omitted scope on API input", () => {
    expect(parseCreateClubStrategyScopeInput({})).toEqual({ kind: "invalid" });
    expect(parseCreateClubStrategyScopeInput({ orgUnitIds: [] })).toEqual({ kind: "invalid" });
  });

  it("accepts explicit scopeClubWide", () => {
    expect(parseCreateClubStrategyScopeInput({ scopeClubWide: true })).toEqual({ kind: "club_wide" });
  });
});