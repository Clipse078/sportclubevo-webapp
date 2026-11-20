import { describe, expect, it } from "vitest";
import {
  buildConnectedWorkspaceHref,
  CD_CONNECTED_VIEWS,
  CD_CONNECTED_VIEW_LABELS,
  parseConnectedViewFromLocation,
} from "../vereinsentwicklung-connected-workspace";
import {
  pathnameMatchesVereinsentwicklungNavHref,
  resolveVereinsentwicklungConnectedNavChildKey,
} from "../vereinsentwicklung-nav-path-aliases";
import { isModuleLocalChildPrimaryActive } from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";

describe("Connected Vereinsentwicklung workspace", () => {
  it("defines five canonical views with aligned labels", () => {
    expect(CD_CONNECTED_VIEWS).toEqual([
      "uebersicht",
      "strategien",
      "ziele",
      "aufgaben",
      "umsetzungsplanung",
    ]);
    expect(CD_CONNECTED_VIEW_LABELS.strategien).toBe("Strategien");
    expect(CD_CONNECTED_VIEW_LABELS.umsetzungsplanung).toBe("Umsetzungsplanung");
  });

  it("builds canonical destinations for each view", () => {
    expect(buildConnectedWorkspaceHref("strategien")).toContain("ansicht=strategie");
    expect(buildConnectedWorkspaceHref("ziele")).toContain("ansicht=ziele");
    expect(buildConnectedWorkspaceHref("aufgaben")).toContain("ansicht=aufgaben");
    expect(buildConnectedWorkspaceHref("umsetzungsplanung")).toContain("ansicht=umsetzungsphasen");
    expect(buildConnectedWorkspaceHref("uebersicht")).toBe("/vereinsleitung/club-entwicklung");
  });

  it("parses active view from pathname and ansicht query", () => {
    const ziele = new URLSearchParams("ansicht=ziele");
    expect(parseConnectedViewFromLocation("/vereinsleitung/strategie-und-ziele", ziele)).toBe("ziele");
    const strategien = new URLSearchParams("ansicht=strategie");
    expect(parseConnectedViewFromLocation("/vereinsleitung/strategie-und-ziele", strategien)).toBe(
      "strategien",
    );
    expect(
      parseConnectedViewFromLocation("/vereinsleitung/sprints/demo-phase/board", new URLSearchParams()),
    ).toBe("umsetzungsplanung");
  });

  it("highlights Umsetzungsplanung for sprint board routes", () => {
    expect(
      pathnameMatchesVereinsentwicklungNavHref(
        "/vereinsleitung/sprints/demo-phase/board",
        "/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen",
      ),
    ).toBe(true);
  });

  it("resolves query-aware mega-menu child keys", () => {
    expect(
      resolveVereinsentwicklungConnectedNavChildKey(
        "/vereinsleitung/strategie-und-ziele",
        new URLSearchParams("ansicht=ziele"),
      ),
    ).toBe("club-entwicklung-ziele");
  });

  it("keeps a single active L3 child per ansicht on Strategie & Ziele", () => {
    const sections = getVisibleNavSections([], "club", { vereinsleitungWorkspace: true });
    const clubDev = sections.flatMap((s) => s.items).find((i) => i.key === "club-entwicklung");
    const children = clubDev?.children ?? [];
    const search = new URLSearchParams("ansicht=ziele");
    const active = children.filter((child) =>
      isModuleLocalChildPrimaryActive(
        "/vereinsleitung/strategie-und-ziele",
        child,
        children,
        null,
        search,
      ),
    );
    expect(active.map((c) => c.label)).toEqual(["Ziele"]);
  });
});