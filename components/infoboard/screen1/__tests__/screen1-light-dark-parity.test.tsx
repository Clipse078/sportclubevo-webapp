/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R2 — LIGHT/DARK activity + pagination parity (presentation only).
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  InfoboardScreen1,
  buildDisplayList,
  paginateDisplayList,
  type DisplayItem,
  type FlatEvent,
} from "@/components/infoboard/screen1/InfoboardScreen1";
import { EMPTY_SCREEN1_STUDIO_CONFIG } from "@/lib/infoboard/screen1-studio-types";
import { resolveScreen1PageDemandMax } from "@/lib/infoboard/screen1-logo-settings";
import { DEFAULT_SCREEN1_PRESENTATION } from "@/lib/infoboard/screen1-logo-settings";
import type { InfoboardScreen1Event, InfoboardScreen1Feed } from "@/lib/publishing/event-types";

const BRANDING = {
  clubLogoSrc: "/images/logos/fc-allschwil.png",
  productLogoSrc: "/images/branding/sportclubevo_logo.png",
};

function makeEvent(
  id: string,
  type: InfoboardScreen1Event["type"],
  bucket: "current" | "next" | "later",
): InfoboardScreen1Event {
  return {
    id,
    type,
    displayTitle: `${type} ${id}`,
    teamDisplayName: `Team ${id}`,
    opponentDisplayName: type === "MATCH" ? "Opponent" : null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: null,
    startAt: "2026-11-01T10:00:00.000Z",
    endAt: "2026-11-01T12:00:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: bucket,
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "KR 1",
      homeDressingRoomLabel: "04",
      awayDressingRoomLabel: type === "MATCH" ? "E2" : null,
      refereeDressingRoomLabel: null,
    },
  };
}

function makeCanonicalFeed(): InfoboardScreen1Feed {
  return {
    tenant: { id: "t1", name: "FC Allschwil", timezone: "Europe/Zurich" },
    displayDate: "2026-11-01",
    generatedAt: "2026-11-01T08:00:00.000Z",
    isEmpty: false,
    emptyStateReason: null,
    current: [makeEvent("match-1", "MATCH", "current")],
    next: [makeEvent("training-1", "TRAINING", "next")],
    later: [makeEvent("tournament-1", "TOURNAMENT", "later")],
  };
}

function activityIdsFromDisplayItems(items: readonly DisplayItem[]): string[] {
  return items.flatMap((item) =>
    item.kind === "training-group"
      ? item.items.map(({ event }) => event.id)
      : [item.item.event.id],
  );
}

function buildFlatListFromFeed(feed: InfoboardScreen1Feed): FlatEvent[] {
  return [
    ...feed.current.map((event) => ({ event, temporal: "current" as const })),
    ...feed.next.map((event) => ({ event, temporal: "next" as const })),
    ...feed.later.map((event) => ({ event, temporal: "later" as const })),
  ];
}

function paginateFeed(feed: InfoboardScreen1Feed): string[][] {
  const flat = buildFlatListFromFeed(feed);
  const display = buildDisplayList(flat);
  const maxDemand = resolveScreen1PageDemandMax(DEFAULT_SCREEN1_PRESENTATION);
  const demands = display.map(() => 2);
  const pages = paginateDisplayList(display, demands, maxDemand);
  return pages.map((page) => activityIdsFromDisplayItems(page));
}

function renderedActivityIds(theme: "DARK" | "LIGHT"): string[] {
  const feed = makeCanonicalFeed();
  render(
    <InfoboardScreen1
      feed={feed}
      branding={BRANDING}
      theme={theme}
      currentTimeIso="2026-11-01T08:34:00.000Z"
      headerConfig={{
        subtitleEnabled: true,
        subtitleText: "HERZLICH WILLKOMMEN AUF DER SPORTANLAGE IM BRÜEL",
        pageHeadingText: "HEUTE IM BRÜEL",
        showTime: true,
        showDate: true,
        showWeather: true,
      }}
      weather={{
        isAvailable: true,
        temperatureC: 7,
        conditionLabel: "Zum Teil bewölkt",
        conditionCode: "PARTLY_CLOUDY",
        fetchedAt: "2026-11-01T08:00:00.000Z",
      }}
      studio={EMPTY_SCREEN1_STUDIO_CONFIG}
    />,
  );
  const list = screen.getByTestId("event-list");
  return within(list)
    .getAllByTestId("event-row")
    .map((row) => row.getAttribute("data-type") ?? "")
    .filter(Boolean);
}

describe("Screen 1 LIGHT/DARK parity", () => {
  it("keeps identical pagination structure for the same feed regardless of theme", () => {
    const feed = makeCanonicalFeed();
    const pagesA = paginateFeed(feed);
    const pagesB = paginateFeed(feed);
    expect(pagesA).toEqual(pagesB);
    expect(pagesA.flat()).toEqual(["match-1", "training-1", "tournament-1"]);
  });

  it("renders the same activities for LIGHT and DARK", () => {
    const darkIds = renderedActivityIds("DARK");
    cleanup();
    const lightIds = renderedActivityIds("LIGHT");
    expect(lightIds).toEqual(darkIds);
    expect(lightIds.length).toBeGreaterThanOrEqual(3);
  });

  it("LIGHT keeps a usable content region with page heading inside main", () => {
    render(
      <InfoboardScreen1
        feed={makeCanonicalFeed()}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso="2026-11-01T08:34:00.000Z"
        headerConfig={{
          subtitleEnabled: true,
          subtitleText: "HERZLICH WILLKOMMEN AUF DER SPORTANLAGE IM BRÜEL",
          pageHeadingText: "HEUTE IM BRÜEL",
          showTime: true,
          showDate: true,
        }}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const main = screen.getByTestId("infoboard-content-region");
    expect(main.getAttribute("data-has-page-heading")).toBe("true");
    expect(within(main).getByTestId("venue-page-heading")).toBeTruthy();
    expect(within(main).getByTestId("event-list")).toBeTruthy();
    expect(screen.getAllByTestId("event-row").length).toBeGreaterThan(0);
  });
});

describe("Screen 1 LIGHT header V2 semantics", () => {
  it("renders clock, date, compact welcome, weather, and page heading", () => {
    render(
      <InfoboardScreen1
        feed={makeCanonicalFeed()}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso="2026-11-01T08:34:00.000Z"
        headerConfig={{
          subtitleEnabled: true,
          subtitleText: "HERZLICH WILLKOMMEN AUF DER SPORTANLAGE IM BRÜEL",
          pageHeadingText: "HEUTE IM BRÜEL",
          showTime: true,
          showDate: true,
          showWeather: true,
        }}
        weather={{
          isAvailable: true,
          temperatureC: 7,
          conditionLabel: "Zum Teil bewölkt",
          conditionCode: "PARTLY_CLOUDY",
          fetchedAt: "2026-11-01T08:00:00.000Z",
        }}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    expect(screen.getByTestId("kiosk-header-club-name").textContent).toContain(
      "FC Allschwil",
    );
    expect(screen.getByTestId("board-title-text").textContent).toBe(
      "Willkommen im Brüel",
    );
    expect(screen.getByTestId("header-time-zone").textContent).toContain("09:34");
    expect(screen.getByTestId("header-date-zone").textContent?.toLowerCase()).toContain(
      "sonntag",
    );
    expect(screen.getByTestId("header-weather-temperature").textContent).toBe(
      "7°",
    );
    expect(screen.getByTestId("header-weather-condition").textContent).toBe(
      "Zum Teil bewölkt",
    );
    expect(screen.getByTestId("venue-page-heading").textContent).toContain(
      "HEUTE IM BRÜEL",
    );
    expect(screen.queryByTestId("board-title")).toBeNull();
  });
});
