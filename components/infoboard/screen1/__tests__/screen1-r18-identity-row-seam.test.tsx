/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R18 — Screen 1 identity + row seam polish (automated contract).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import {
  KABINE_FOREGROUND_OPACITY,
  VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT,
} from "@/lib/infoboard/screen1-ambient-depth";
import { VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES } from "@/lib/infoboard/venue-display-grid";
import type {
  InfoboardScreen1Event,
  InfoboardScreen1Feed,
} from "@/lib/publishing/event-types";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../InfoboardScreen1.module.css"),
  "utf8",
);
const KIOSK_HEADER_SOURCE = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../shared/KioskShellHeader.tsx",
  ),
  "utf8",
);

function cssBlock(selector: string): string {
  const start = CSS.indexOf(selector);
  expect(start, `Missing CSS selector ${selector}`).toBeGreaterThanOrEqual(0);
  return CSS.slice(start, CSS.indexOf("}", start));
}

function makeFeed(events: InfoboardScreen1Event[]): InfoboardScreen1Feed {
  return {
    generatedAt: "2026-09-12T08:00:00.000Z",
    tenant: {
      id: "tenant-fca",
      key: "fc-allschwil",
      name: "FC Allschwil",
      timezone: "Europe/Zurich",
    },
    displayDate: "2026-09-12",
    isStale: false,
    wochenplanVariantBadge: null,
    current: [],
    next: events,
    later: [],
    isEmpty: events.length === 0,
    emptyStateReason: events.length === 0 ? "NO_EVENTS_TODAY" : null,
  };
}

function makeMatch(
  overrides: Partial<InfoboardScreen1Event> = {},
): InfoboardScreen1Event {
  return {
    id: "m-r18",
    type: "MATCH",
    displayTitle: "Match",
    teamDisplayName: "FC Allschwil",
    opponentDisplayName: "FC Opponent",
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: "JUNIORINNEN FF-17 1. STÄRKEKLASSE",
    startAt: "2026-09-12T10:30:00.000Z",
    endAt: null,
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "STADION",
      homeDressingRoomLabel: "E1",
      awayDressingRoomLabel: "E2",
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

function makeTournament(
  overrides: Partial<InfoboardScreen1Event> = {},
): InfoboardScreen1Event {
  return {
    id: "t-r18",
    type: "TOURNAMENT",
    displayTitle: "F-BLITZTURNIER",
    teamDisplayName: null,
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: "FC ALLSCHWIL",
    competitionLabel: null,
    startAt: "2026-09-12T11:00:00.000Z",
    endAt: null,
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "KR 2",
      homeDressingRoomLabel: null,
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("R18 MATCH presentation", () => {
  it("keeps MATCH label and hides competition subtitle on Screen 1", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([makeMatch()])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const card = screen.getByTestId("event-row");
    expect(within(card).getByText("MATCH")).toBeTruthy();
    expect(
      within(card).queryByText("JUNIORINNEN FF-17 1. STÄRKEKLASSE"),
    ).toBeNull();
  });
});

describe("R18 TURNIER presentation", () => {
  it("keeps TURNIER label and title; hides organiser subtitle", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([makeTournament()])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const card = screen.getByTestId("event-row");
    expect(within(card).getByText("TURNIER")).toBeTruthy();
    expect(within(card).getByText("F-BLITZTURNIER")).toBeTruthy();
    expect(within(card).queryByText(/^FC ALLSCHWIL$/i)).toBeNull();
  });
});

describe("R18 header identity", () => {
  it("uses canonical bold italic condensed contract for venue header tenant name", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([makeMatch()])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    const club = screen.getByTestId("kiosk-header-club-name");
    expect(club.getAttribute("data-venue-header-identity")).toBe("true");
    expect(club.textContent).toContain("FC Allschwil");
    expect(KIOSK_HEADER_SOURCE).toMatch(/data-venue-header-identity/);
    expect(KIOSK_HEADER_SOURCE).toMatch(/fontStyle:[\s\S]*italic/);
    expect(KIOSK_HEADER_SOURCE).toMatch(/Barlow Condensed/);
  });
});

describe("R18 section header HEUTE IM BRÜEL", () => {
  it("renders upright condensed eyebrow with unchanged wording", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([makeMatch()])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
        headerConfig={{ pageHeadingText: "HEUTE IM BRÜEL" }}
      />,
    );
    expect(screen.getByTestId("venue-page-heading").textContent).toContain(
      "HEUTE IM BRÜEL",
    );
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.boardTitleText[\s\S]*font-style:\s*normal/,
    );
  });
});

describe("R18 row seam contract", () => {
  it("uses one light-theme row separator without floating card frame", () => {
    expect(CSS).toMatch(/--ib-row-separator:\s*rgba\(11,\s*31,\s*58,\s*0\.08\)/);
    const lightCard = cssBlock(".root[data-theme=\"light\"] .eventCard {");
    expect(lightCard).toMatch(/border-bottom:\s*1px solid var\(--ib-row-separator\)/);
    expect(lightCard).toMatch(/border-radius:\s*0/);
    expect(lightCard).toMatch(/box-shadow:\s*none/);
    expect(lightCard).not.toMatch(/border-top:/);
    expect(cssBlock(".root[data-theme=\"light\"] .eventList {")).toMatch(/gap:\s*0/);
    expect(lightCard).not.toMatch(/border-top:/);
  });

  it("keeps TIME + operational grid on one row with 15/43/22/20 columns", () => {
    const { time, activity, kabine, platz } = VENUE_ACTIVITY_GRID_ZONE_PERCENTAGES;
    expect(time).toBe(15);
    expect(activity).toBe(43);
    expect(kabine).toBe(22);
    expect(platz).toBe(20);
    render(
      <InfoboardScreen1
        feed={makeFeed([makeMatch(), makeTournament({ id: "t2" })])}
        currentTimeIso="2026-09-12T08:00:00.000Z"
        theme="LIGHT"
      />,
    );
    expect(screen.getAllByTestId("event-row")).toHaveLength(2);
    for (const row of screen.getAllByTestId("event-row")) {
      expect(row.querySelector('[data-venue-column="time"]')).toBeTruthy();
      expect(row.querySelector('[data-venue-column="activity"]')).toBeTruthy();
      expect(row.querySelector('[data-venue-column="kabine"]')).toBeTruthy();
      expect(row.querySelector('[data-venue-column="platz"]')).toBeTruthy();
    }
  });
});

describe("R18 R16 lock", () => {
  it("preserves ambient opacity tokens and true cover contract", () => {
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT.MATCH).toBe(0.42);
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT.TOURNAMENT).toBe(0.38);
    expect(VENUE_ACTIVITY_AMBIENT_IMAGE_OPACITY_LIGHT.TRAINING).toBe(0.34);
  });
});

describe("R18 R17 lock", () => {
  it("preserves Kabine foreground opacity and per-cell veil containment hooks", () => {
    expect(KABINE_FOREGROUND_OPACITY).toBe(1);
    expect(CSS).toMatch(
      /\.root\[data-theme="light"\] \.eventCard\[data-venue-operational-ambient="true"\] \[data-venue-column="kabine"\][\s\S]*::before/,
    );
  });
});
