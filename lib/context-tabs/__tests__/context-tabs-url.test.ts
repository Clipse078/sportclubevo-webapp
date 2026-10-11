import { describe, expect, it } from "vitest";
import {
  buildContextTabHref,
  readContextTabParam,
  resolveContextTabFromSearchParams,
} from "../url";
import type { ContextTabDefinition } from "../types";

const visibleTabs: ContextTabDefinition[] = [
  { key: "uebersicht", label: "Übersicht", placement: "primary" },
  { key: "teilnahme", label: "Teilnahme", placement: "primary" },
  { key: "hidden", label: "Hidden", placement: "primary", visible: false },
];

describe("SCE-UI-ROLLOUT-01B — context tab URL resolution", () => {
  it("defaults when tab param is missing", () => {
    expect(
      resolveContextTabFromSearchParams({
        tabParam: null,
        defaultTab: "uebersicht",
        visibleTabs,
      }),
    ).toBe("uebersicht");
  });

  it("honours visible deep-linked tab", () => {
    expect(
      resolveContextTabFromSearchParams({
        tabParam: "teilnahme",
        defaultTab: "uebersicht",
        visibleTabs,
      }),
    ).toBe("teilnahme");
  });

  it("falls back for hidden or unknown tabs", () => {
    expect(
      resolveContextTabFromSearchParams({
        tabParam: "hidden",
        defaultTab: "uebersicht",
        visibleTabs,
      }),
    ).toBe("uebersicht");

    expect(
      resolveContextTabFromSearchParams({
        tabParam: "not-a-tab",
        defaultTab: "uebersicht",
        visibleTabs,
      }),
    ).toBe("uebersicht");
  });

  it("falls back to first visible when default is hidden", () => {
    const onlyTeilnahme: ContextTabDefinition[] = [
      { key: "uebersicht", label: "Übersicht", placement: "primary", visible: false },
      { key: "teilnahme", label: "Teilnahme", placement: "primary", visible: true },
    ];
    expect(
      resolveContextTabFromSearchParams({
        tabParam: null,
        defaultTab: "uebersicht",
        visibleTabs: onlyTeilnahme,
      }),
    ).toBe("teilnahme");
  });

  it("buildContextTabHref preserves pathname and sets tab query", () => {
    expect(buildContextTabHref("/dashboard/teams/t1", "programm")).toBe(
      "/dashboard/teams/t1?tab=programm",
    );
  });

  it("readContextTabParam reads from URLSearchParams and records", () => {
    expect(readContextTabParam(new URLSearchParams("tab=kader"))).toBe("kader");
    expect(readContextTabParam({ tab: "trainer" })).toBe("trainer");
    expect(readContextTabParam({ tab: ["planung", "ignored"] })).toBe("planung");
  });
});
