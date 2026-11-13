/**
 * SCE-DS2-PLANNER-UX-01 — Wochenplaner Liste match row width / fixture contract.
 */

import { describe, expect, it } from "vitest";
import {
  PLANNING_HUB_LISTE_MATCH_DESKTOP_MIN_WIDTH_PX,
  PLANNING_HUB_LISTE_MATCH_ROW_GEOMETRY,
  planningHubListeMatchFixtureContractAtWidth,
} from "../planning-hub-liste-match-geometry";
import { resolveActivityClippedDetailOffer } from "../activity-clipped-detail";

describe("planning-hub-liste-match-geometry", () => {
  it("uses desktop-forward clipped-detail geometry hints", () => {
    expect(PLANNING_HUB_LISTE_MATCH_ROW_GEOMETRY.blockWidthPx).toBeGreaterThanOrEqual(640);
    expect(PLANNING_HUB_LISTE_MATCH_ROW_GEOMETRY.compact).toBe(false);
    expect(resolveActivityClippedDetailOffer(PLANNING_HUB_LISTE_MATCH_ROW_GEOMETRY, null)).toBe(false);
  });

  it("keeps programme-fixture on reference-split for desktop and mobile widths", () => {
    expect(planningHubListeMatchFixtureContractAtWidth(null)).toBe("reference-split");
    expect(planningHubListeMatchFixtureContractAtWidth(1280)).toBe("reference-split");
    expect(planningHubListeMatchFixtureContractAtWidth(320)).toBe("reference-split");
    expect(PLANNING_HUB_LISTE_MATCH_DESKTOP_MIN_WIDTH_PX).toBe(640);
  });
});
