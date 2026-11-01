/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R8R1 — activity row geometry regression (Screen 1).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import type { InfoboardTeamAllocationPresentation } from "@/components/infoboard/screen1/screen1-presentation-types";
import { VENUE_LIGHT_TIME_SURFACE_VARS } from "@/lib/infoboard/venue-display-grid";
import { VENUE_PRESENTATION_DENSITY_ATTR } from "@/lib/infoboard/venue-presentation-density";
import type { InfoboardEventPresentationExtension } from "@/components/infoboard/screen1/screen1-presentation-types";
import type {
  InfoboardScreen1Event,
  InfoboardScreen1Feed,
} from "@/lib/publishing/event-types";

const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../InfoboardScreen1.module.css"),
  "utf8",
);

function cssBlock(selectorPrefix: string): string {
  const start = CSS.indexOf(selectorPrefix);
  if (start < 0) return "";
  const brace = CSS.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < CSS.length; i += 1) {
    if (CSS[i] === "{") depth += 1;
    if (CSS[i] === "}") {
      depth -= 1;
      if (depth === 0) return CSS.slice(start, i + 1);
    }
  }
  return CSS.slice(start);
}

function makeFeed(
  overrides: Partial<InfoboardScreen1Feed> = {},
): InfoboardScreen1Feed {
  return {
    generatedAt: "2026-11-01T08:00:00.000Z",
    tenant: {
      id: "tenant-fca",
      key: "fc-allschwil",
      name: "FC Allschwil",
      timezone: "Europe/Zurich",
    },
    displayDate: "2026-11-01",
    isStale: false,
    wochenplanVariantBadge: null,
    current: [],
    next: [],
    later: [],
    isEmpty: true,
    emptyStateReason: "NO_EVENTS_TODAY",
    ...overrides,
  };
}

function makeMatch(id: string, startAt: string): InfoboardScreen1Event {
  return {
    id,
    type: "MATCH",
    displayTitle: "Match",
    teamDisplayName: "FC ALLSCHWIL JUNIOREN FF-14",
    opponentDisplayName: "FC NORDSTERN BS FF14-9",
    opponentLogoUrl: null,
    matchPresentation: {
      home: {
        clubDisplayName: "FC ALLSCHWIL",
        teamSubDisplayName: "JUNIOREN FF-14",
        clubLogoUrl: "/home.png",
      },
      away: {
        clubDisplayName: "FC NORDSTERN",
        teamSubDisplayName: "BS FF14-9",
        clubLogoUrl: null,
      },
    },
    organizerDisplayName: null,
    competitionLabel: "Meisterschaft",
    startAt,
    endAt: "2026-11-01T13:30:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2026-27",
    allocation: {
      pitchLabel: "KUNSTRASEN 3",
      homeDressingRoomLabel: "04",
      awayDressingRoomLabel: "E2",
      refereeDressingRoomLabel: null,
    },
  };
}

function makeTournament(id: string, startAt: string): InfoboardScreen1Event {
  return {
    id,
    type: "TOURNAMENT",
    displayTitle: "Turnier",
    teamDisplayName: "Turnier",
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: "Hallenturnier",
    startAt,
    endAt: "2026-11-01T16:00:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2026-27",
    allocation: {
      pitchLabel: "HALLE 1",
      homeDressingRoomLabel: null,
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
  };
}

function tournamentExtensions(
  eventId: string,
  participants: InfoboardTeamAllocationPresentation[],
): readonly InfoboardEventPresentationExtension[] {
  return [
    {
      eventId,
      participantAllocations: participants,
    },
  ];
}

describe("R8R1 — height contract (CSS)", () => {
  it("main participates in the screen grid flex region", () => {
    expect(cssBlock(".main {")).toMatch(/flex:\s*1/);
    expect(cssBlock(".root {\n  display: grid")).toContain(
      "grid-template-rows: auto minmax(0, 1fr) auto",
    );
    expect(cssBlock(".pageRotator {")).toMatch(/flex:\s*1/);
    expect(cssBlock(".eventList {")).toMatch(/flex:\s*1/);
  });

  it("does not cap low-count cards with vh clamps", () => {
    expect(CSS).not.toMatch(
      /\.eventList\[data-count="2"\][\s\S]*clamp\(280px,\s*38vh,\s*420px\)/,
    );
    expect(CSS).not.toMatch(
      /\.eventList\[data-count="1"\][\s\S]*clamp\(300px,\s*40vh,\s*460px\)/,
    );
  });

  for (const count of ["1", "2", "3"] as const) {
    it(`uses equal flexible grid rows for ${count} activities (normal density)`, () => {
      const rowPattern =
        count === "1"
          ? /grid-template-rows:\s*minmax\(0,\s*1fr\)/
          : new RegExp(
              `grid-template-rows:\\s*repeat\\(${count},\\s*minmax\\(0,\\s*1fr\\)\\)`,
            );
      expect(CSS).toMatch(
        new RegExp(
          `\\.eventList\\[data-count="${count}"\\]:not\\(\\[data-density="dense"\\]\\):not\\(\\[data-density="ultra"\\]\\)[\\s\\S]*${rowPattern.source}`,
        ),
      );
      expect(CSS).toMatch(
        new RegExp(
          `\\.eventList\\[data-count="${count}"\\]:not\\(\\[data-density="dense"\\]\\):not\\(\\[data-density="ultra"\\]\\) \\.eventCard[\\s\\S]*height:\\s*100%`,
        ),
      );
    });
  }

  it("does not center-fill low-count pages vertically", () => {
    expect(cssBlock(".eventList[data-layout-mode=\"fill\"][data-density=\"normal\"]")).toMatch(
      /:not\(\[data-count="1"\]\):not\(\[data-count="2"\]\):not\(\[data-count="3"\]\)/,
    );
  });
});

describe("R8R1 — rendered list geometry", () => {
  function renderTwoActivityPage() {
    const match = makeMatch("m-1", "2026-11-01T11:30:00.000Z");
    const tour = makeTournament("t-1", "2026-11-01T14:00:00.000Z");
    render(
      <InfoboardScreen1
        feed={makeFeed({
          current: [],
          next: [match, tour],
          isEmpty: false,
          emptyStateReason: null,
        })}
        theme="LIGHT"
        headerConfig={{ pageHeadingText: "Heute im Brüel" }}
        eventPresentation={tournamentExtensions("t-1", [
          { id: "p1", teamDisplayName: "Team A", dressingRoomLabel: "01" },
          { id: "p2", teamDisplayName: "Team B", dressingRoomLabel: "02" },
          { id: "p3", teamDisplayName: "Team C", dressingRoomLabel: "03" },
        ])}
      />,
    );
  }

  it("two activities → spacious density and fill layout mode", () => {
    renderTwoActivityPage();
    const list = screen.getByTestId("event-list");
    expect(list.getAttribute("data-count")).toBe("2");
    expect(list.getAttribute("data-density")).toBe("normal");
    expect(list.getAttribute(VENUE_PRESENTATION_DENSITY_ATTR)).toBe("spacious");
    expect(list.getAttribute("data-layout-mode")).toBe("fill");
  });

  it("event list targets bounded row tracks (CSS contract, not vh-capped cards)", () => {
    renderTwoActivityPage();
    const list = screen.getByTestId("event-list");
    expect(list.className).toMatch(/eventList/);
    expect(CSS).toMatch(
      /\.eventList\[data-count="2"\]:not\(\[data-density="dense"\]\):not\(\[data-density="ultra"\]\)\s+\.eventCard[\s\S]*max-height:\s*none/,
    );
    expect(CSS).not.toMatch(/38vh,\s*420px/);
  });

  it("preserves R8 TIME-only tints and white operational columns", () => {
    renderTwoActivityPage();
    for (const token of Object.values(VENUE_LIGHT_TIME_SURFACE_VARS)) {
      expect(CSS).toContain(token);
    }
    expect(CSS).toMatch(/--ib-zone-surface-activity:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-kabine:\s*#FFFFFF/);
    expect(CSS).toMatch(/--ib-zone-surface-platz:\s*#FFFFFF/);
  });

  it("keeps split match identity in the DOM (tenant home)", () => {
    renderTwoActivityPage();
    expect(screen.getAllByText("FC ALLSCHWIL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("JUNIOREN FF-14").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FC NORDSTERN").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BS FF14-9").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("FC ALLSCHWIL JUNIOREN FF-14", { exact: false }),
    ).toBeNull();
  });

  it("one activity page exposes data-count=1 for row geometry", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed({
          current: [makeMatch("solo", "2026-11-01T11:30:00.000Z")],
          isEmpty: false,
          emptyStateReason: null,
        })}
        theme="LIGHT"
      />,
    );
    const list = screen.getByTestId("event-list");
    expect(list.getAttribute("data-count")).toBe("1");
    expect(list.getAttribute("data-density")).toBe("normal");
    expect(screen.getAllByTestId("event-row")).toHaveLength(1);
  });

  it("three activities on one page expose data-count=3", () => {
    const compactMatch = (id: string, startAt: string): InfoboardScreen1Event => ({
      ...makeMatch(id, startAt),
      endAt: null,
    });
    render(
      <InfoboardScreen1
        feed={makeFeed({
          next: [
            compactMatch("a", "2026-11-01T09:00:00.000Z"),
            compactMatch("b", "2026-11-01T11:00:00.000Z"),
            compactMatch("c", "2026-11-01T13:00:00.000Z"),
          ],
          isEmpty: false,
          emptyStateReason: null,
        })}
        theme="LIGHT"
      />,
    );
    const list = screen.getByTestId("event-list");
    expect(list.getAttribute("data-count")).toBe("3");
    expect(screen.getAllByTestId("event-row")).toHaveLength(3);
  });
});
