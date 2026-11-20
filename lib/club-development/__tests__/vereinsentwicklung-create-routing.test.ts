import { describe, expect, it } from "vitest";
import {
  buildVereinsentwicklungStrategieNeuHref,
  buildVereinsentwicklungZielNeuHref,
  parseLinkFocusQuery,
  parseSafeReturnToHref,
} from "../vereinsentwicklung-create-routing";

describe("vereinsentwicklung-create-routing", () => {
  it("builds strategie neu with org filter and returnTo", () => {
    const href = buildVereinsentwicklungStrategieNeuHref({
      orgUnitId: "org-a",
    });
    expect(href).toContain("/strategie-und-ziele/strategie/neu");
    expect(href).toContain("orgEinheit=org-a");
    expect(href).toContain("returnTo=");
  });

  it("builds ziel neu with locked strategie and link focus", () => {
    const href = buildVereinsentwicklungZielNeuHref({
      orgUnitId: "org-a",
      clubStrategyId: "strat-1",
      linkFocus: true,
    });
    expect(href).toContain("/strategie-und-ziele/ziele/neu");
    expect(href).toContain("clubStrategyId=strat-1");
    expect(href).toContain("linkFocus=1");
  });

  it("rejects unsafe returnTo values", () => {
    expect(parseSafeReturnToHref("https://evil.test", "/safe")).toBe("/safe");
    expect(parseSafeReturnToHref("/vereinsleitung/strategie-und-ziele?ansicht=ziele", "/safe")).toContain(
      "ansicht=ziele",
    );
  });

  it("parses linkFocus query", () => {
    expect(parseLinkFocusQuery("1")).toBe(true);
    expect(parseLinkFocusQuery("0")).toBe(false);
  });
});