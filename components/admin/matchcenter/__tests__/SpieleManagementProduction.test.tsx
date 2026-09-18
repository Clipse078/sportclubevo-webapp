/**
 * SPIELE-UX-01B — production hardening + server render gate for Spiele overview.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { deriveSpieleManagementPresentation } from "@/lib/matchcenter/management-view";
import SpieleManagementWorkspace from "@/components/admin/matchcenter/SpieleManagementWorkspace";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";

const ROOT = resolve(__dirname, "../../../..");
const SPIELE_DIR = join(ROOT, "components/admin/matchcenter");

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function listSpieleManagementSources(): string[] {
  return readdirSync(SPIELE_DIR)
    .filter(
      (name) =>
        name.startsWith("SpieleManagement") &&
        (name.endsWith(".tsx") || name.endsWith(".ts")),
    )
    .map((name) => join(SPIELE_DIR, name));
}

describe("SPIELE-UX-01B — production interactivity", () => {
  it("Spiele management components do not use placeholder hash links", () => {
    for (const file of listSpieleManagementSources()) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/href\s*=\s*["']#["']/);
      expect(source, file).not.toMatch(/href\s*=\s*\{\s*["']#["']\s*\}/);
    }
  });

  it("create action uses canonical route without fake dropdown chevron", () => {
    const source = readSource("components/admin/matchcenter/SpieleManagementHeaderMenu.tsx");
    expect(source).toContain('href="/dashboard/matchcenter/new"');
    expect(source).not.toContain("ChevronDown");
  });

  it("ViewSwitcher is a Server Component (link-only view control)", () => {
    const source = readSource("components/admin/matchcenter/SpieleManagementViewSwitcher.tsx");
    expect(source).not.toMatch(/^"use client"/m);
  });
});

describe("SPIELE-UX-01B — server render gate", () => {
  it("deriveSpieleManagementPresentation runs on the server import path", () => {
    const derived = deriveSpieleManagementPresentation([], {
      tab: "SPIELPLANUNG",
      searchQuery: "",
      sort: "KICKOFF_ASC",
      statusMask: ["anstehend", "offen", "bereit"],
      homeAwayFilter: "ALLE",
      competitionFilter: null,
      venueFilter: null,
      locale: "de-CH",
      timezone: "Europe/Zurich",
      wochenplanFilter: "ALLE",
      teamFilter: null,
    });
    expect(derived.matchDayKeys).toEqual([]);
    expect(derived.spielplanungDayGroups).toEqual([]);
  });

  it("SpieleManagementWorkspace server-renders without client helper invocation", () => {
    const monthWindow = {
      param: "2026-09",
      label: "September 2026",
      previousParam: "2026-08",
      nextParam: "2026-10",
    };

    const html = renderToStaticMarkup(
      <SpieleManagementWorkspace
        matches={[] as MatchcenterMatchSummary[]}
        tab="SPIELPLANUNG"
        actionFilter="ALLE"
        wochenplanFilter="ALLE"
        teamFilter={null}
        teamOptions={[]}
        monthWindow={monthWindow}
        currentMonthParam="2026-09"
      />,
    );

    expect(html).toContain('data-testid="spiele-management-workspace"');
    expect(html).toContain("Keine Spiele gefunden");
    expect(html).toContain('data-testid="spiele-month-calendar"');
  });
});
