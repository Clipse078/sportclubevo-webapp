import { describe, expect, it } from "vitest";
import {
  buildActivityTabHref,
  isActivityTabKey,
  resolveActivityTabFromSearchParams,
} from "../url";
import type { ActivityTabDefinition } from "../types";

const visibleTabs: ActivityTabDefinition[] = [
  { key: "uebersicht", label: "Übersicht", placement: "primary" },
  { key: "teilnahme", label: "Teilnahme", placement: "primary" },
  { key: "aufgebot", label: "Aufgebot", placement: "primary", visible: false },
];

describe("SCE-ACTIVITY-NAV-01 — URL tab resolution", () => {
  it("defaults to uebersicht when tab param is missing", () => {
    expect(
      resolveActivityTabFromSearchParams({
        tabParam: null,
        defaultTab: "uebersicht",
        visibleTabs,
      }),
    ).toBe("uebersicht");
  });

  it("honours deep-linked tab when visible", () => {
    expect(
      resolveActivityTabFromSearchParams({
        tabParam: "teilnahme",
        defaultTab: "uebersicht",
        visibleTabs,
      }),
    ).toBe("teilnahme");
  });

  it("falls back when tab is hidden or unknown", () => {
    expect(
      resolveActivityTabFromSearchParams({
        tabParam: "aufgebot",
        defaultTab: "uebersicht",
        visibleTabs,
      }),
    ).toBe("uebersicht");

    expect(
      resolveActivityTabFromSearchParams({
        tabParam: "not-a-tab",
        defaultTab: "uebersicht",
        visibleTabs,
      }),
    ).toBe("uebersicht");
  });

  it("buildActivityTabHref produces stable query URLs", () => {
    expect(buildActivityTabHref("/dashboard/matchcenter/m1", "spielbetrieb")).toBe(
      "/dashboard/matchcenter/m1?tab=spielbetrieb",
    );
  });

  it("isActivityTabKey validates known keys", () => {
    expect(isActivityTabKey("kommunikation")).toBe(true);
    expect(isActivityTabKey("bogus")).toBe(false);
  });
});
