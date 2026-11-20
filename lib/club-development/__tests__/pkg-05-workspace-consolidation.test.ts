import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import {
  buildStrategieUndZieleHref,
  buildVorhabenUndUmsetzungHref,
  CD_LEGACY_ROUTE_ALIASES,
  CD_STRATEGIE_ZIELE_BASE,
  CD_VORHABEN_UMSETZUNG_BASE,
  legacyBacklogRedirect,
  legacySprintsRedirect,
  legacyTargetsListRedirect,
} from "../vereinsentwicklung-workspace-routing";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PKG-05 Vereinsentwicklung workspace consolidation", () => {
  it("exposes five connected Vereinsentwicklung nav entries", () => {
    const sections = getVisibleNavSections([], "club", { vereinsleitungWorkspace: true });
    const clubDev = sections.flatMap((s) => s.items).find((i) => i.key === "club-entwicklung");
    expect(clubDev?.children?.map((c) => c.key)).toEqual([
      "club-entwicklung-uebersicht",
      "club-entwicklung-strategien",
      "club-entwicklung-ziele",
      "club-entwicklung-aufgaben",
      "club-entwicklung-umsetzungsplanung",
    ]);
    expect(clubDev?.children?.map((c) => c.label)).toEqual([
      "Übersicht",
      "Strategien",
      "Ziele",
      "Aufgaben",
      "Umsetzungsplanung",
    ]);
  });

  it("omits Prozesse & Richtlinien from main Vereinsentwicklung menu", () => {
    const nav = read("lib/nav/nav-config.ts");
    expect(nav).not.toContain("club-entwicklung-prozesse");
    expect(read("app/(admin)/vereinsleitung/prozesse/page.tsx")).toContain("prozesse");
  });

  it("maps legacy list routes to workspace views preserving query params", () => {
    expect(legacyTargetsListRedirect({ status: "ACTIVE" })).toBe(
      `${CD_STRATEGIE_ZIELE_BASE}?ansicht=ziele&status=ACTIVE`,
    );
    expect(legacyBacklogRedirect({ targetId: "t1" })).toBe(
      `${CD_VORHABEN_UMSETZUNG_BASE}?ansicht=umsetzungsphasen&targetId=t1&umsetzungsabschnitt=ungeplant`,
    );
    expect(legacySprintsRedirect({})).toBe(`${CD_VORHABEN_UMSETZUNG_BASE}?ansicht=umsetzungsphasen`);
  });

  it("uses URL-addressable local views for Back compatibility", () => {
    expect(buildStrategieUndZieleHref("ziele")).toContain("ansicht=ziele");
    expect(buildVorhabenUndUmsetzungHref("aufgaben", { returnTo: "/foo" })).toContain("returnTo=");
  });

  it("keeps contextual create on inline collapsible cards in consolidated workspaces", () => {
    expect(read("components/admin/club-development/StrategieUndZieleWorkspaceClient.tsx")).toContain(
      "StrategyAuthoringPanel",
    );
    expect(read("components/admin/club-development/StrategyAuthoringPanel.tsx")).toContain(
      "CreateTargetContextualCollapsibleCard",
    );
    expect(read("components/admin/club-development/ZieleWorkspacePanel.tsx")).toContain(
      "CreateTargetWorkspaceCollapsibleCard",
    );
    expect(read("components/admin/targets/TargetZieleCollapsibleCard.tsx")).toContain("aria-expanded");
    expect(read("components/admin/club-development/VorhabenCollapsibleCard.tsx")).toContain("aria-expanded");
  });

  it("documents legacy aliases without removing detail routes", () => {
    expect(CD_LEGACY_ROUTE_ALIASES.length).toBeGreaterThanOrEqual(5);
    expect(read("app/(admin)/vereinsleitung/targets/[id]/page.tsx")).toContain("TargetInitiativeLinksSection");
    expect(read("app/(admin)/vereinsleitung/strategie/page.tsx")).toContain("redirect(");
  });
});