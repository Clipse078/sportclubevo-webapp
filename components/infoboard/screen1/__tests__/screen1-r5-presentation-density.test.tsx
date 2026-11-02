/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R5 — presentation density + scale contracts (automated).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  InfoboardScreen1,
  resolveVenuePresentationDensity,
  VENUE_PRESENTATION_DENSITY_ATTR,
} from "@/components/infoboard/screen1/InfoboardScreen1";
import {
  VENUE_ACTIVITY_COLUMN_ATTR,
  VENUE_ACTIVITY_GRID_DATA_ATTR,
  VENUE_ACTIVITY_ZONE_ATTR,
  VENUE_ACTIVITY_ZONE_CONTEXT,
  VENUE_MATCH_LAYOUT_ATTR,
  VENUE_MATCH_LAYOUT_SYMMETRIC,
} from "@/lib/infoboard/venue-display-grid";
import { scaleVenuePresentationClamp } from "@/lib/infoboard/venue-presentation-density";
import { MATCH_FONT_SIZE_CSS } from "@/lib/infoboard/screen1-logo-settings";
import type {
  InfoboardScreen1Feed,
  InfoboardScreen1Event,
} from "@/lib/publishing/event-types";
import {
  buildInfoboardMatchIdentityFromFixtureFields,
  resolveInfoboardMatchPresentation,
} from "@/lib/publishing/presentation/infoboard-match-presentation";

function makeFeed(
  overrides: Partial<InfoboardScreen1Feed> = {},
): InfoboardScreen1Feed {
  return {
    generatedAt: "2026-11-01T08:00:00.000Z",
    tenant: {
      id: "tenant-test",
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

function makeEvent(
  overrides: Partial<InfoboardScreen1Event> = {},
): InfoboardScreen1Event {
  const base: InfoboardScreen1Event = {
    id: "evt-1",
    type: "TRAINING",
    displayTitle: "Training",
    teamDisplayName: "Junioren F2",
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: null,
    startAt: "2026-11-01T11:30:00.000Z",
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
    ...overrides,
  };

  if (
    base.type === "MATCH" &&
    base.matchPresentation === null &&
    (base.teamDisplayName !== null || base.opponentDisplayName !== null)
  ) {
    return {
      ...base,
      matchPresentation: resolveInfoboardMatchPresentation(
        buildInfoboardMatchIdentityFromFixtureFields({
          homeAway: "HOME",
          team: null,
          teamDisplayName: base.teamDisplayName,
          opponentDisplayName: base.opponentDisplayName,
          opponentLogoUrl: base.opponentLogoUrl,
        }),
        null,
        "FC Allschwil",
      ),
    };
  }

  return base;
}

function feedWithEvents(events: InfoboardScreen1Event[]): InfoboardScreen1Feed {
  return makeFeed({
    current: [],
    next: events,
    later: [],
    isEmpty: false,
    emptyStateReason: null,
  });
}

describe("Screen1 R5 venue presentation density", () => {
  it("1 activity → spacious on the event list", () => {
    const feed = feedWithEvents([
      makeEvent({
        id: "m1",
        type: "MATCH",
        teamDisplayName: "FC Allschwil",
        opponentDisplayName: "FC Nordstern",
      }),
    ]);
    render(
      <InfoboardScreen1
        feed={feed}
        currentTimeIso="2026-11-01T10:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    expect(screen.getByTestId("event-list").getAttribute(VENUE_PRESENTATION_DENSITY_ATTR)).toBe(
      "spacious",
    );
  });

  it("2 activities → spacious", () => {
    const feed = feedWithEvents([
      makeEvent({
        id: "m1",
        type: "MATCH",
        startAt: "2026-11-01T11:30:00.000Z",
        teamDisplayName: "FC Allschwil",
        opponentDisplayName: "FC Nordstern",
      }),
      makeEvent({
        id: "t1",
        type: "TRAINING",
        startAt: "2026-11-01T12:00:00.000Z",
        teamDisplayName: "Junioren F2",
      }),
    ]);
    render(
      <InfoboardScreen1
        feed={feed}
        currentTimeIso="2026-11-01T10:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    expect(screen.getByTestId("event-list").getAttribute(VENUE_PRESENTATION_DENSITY_ATTR)).toBe(
      "spacious",
    );
  });

  it("3+ activities → standard", () => {
    const feed = feedWithEvents([
      makeEvent({
        id: "m1",
        type: "MATCH",
        startAt: "2026-11-01T11:30:00.000Z",
        teamDisplayName: "FC Allschwil",
        opponentDisplayName: "FC Nordstern",
      }),
      makeEvent({
        id: "to1",
        type: "TOURNAMENT",
        startAt: "2026-11-01T12:00:00.000Z",
        displayTitle: "F-Blitzturnier",
        teamDisplayName: null,
      }),
      makeEvent({
        id: "tr1",
        type: "TRAINING",
        startAt: "2026-11-01T15:00:00.000Z",
        teamDisplayName: "Junioren F2",
      }),
    ]);
    render(
      <InfoboardScreen1
        feed={feed}
        currentTimeIso="2026-11-01T10:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    expect(screen.getByTestId("event-list").getAttribute(VENUE_PRESENTATION_DENSITY_ATTR)).toBe(
      "standard",
    );
  });

  it("density does not change event ids or order", () => {
    const twoEventFeed = feedWithEvents([
      makeEvent({
        id: "first",
        type: "MATCH",
        teamDisplayName: "FC A",
        opponentDisplayName: "FC B",
      }),
      makeEvent({
        id: "second",
        type: "TRAINING",
        startAt: "2026-11-01T12:00:00.000Z",
        teamDisplayName: "Team C",
      }),
    ]);
    const { rerender } = render(
      <InfoboardScreen1
        feed={twoEventFeed}
        currentTimeIso="2026-11-01T10:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const twoLabels = screen.getAllByTestId("event-row").map((row) => row.getAttribute("data-type"));
    rerender(
      <InfoboardScreen1
        feed={feedWithEvents([
          ...twoEventFeed.next!,
          makeEvent({
            id: "third",
            type: "TRAINING",
            startAt: "2026-11-01T13:00:00.000Z",
            teamDisplayName: "Team D",
          }),
        ])}
        currentTimeIso="2026-11-01T10:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const threeLabels = screen
      .getAllByTestId("event-row")
      .slice(0, 2)
      .map((row) => row.getAttribute("data-type"));
    expect(threeLabels).toEqual(twoLabels);
  });

  it("preserves locked four-column grid and top alignment markers", () => {
    const feed = feedWithEvents([
      makeEvent({
        id: "m1",
        type: "MATCH",
        teamDisplayName: "FC Allschwil",
        opponentDisplayName: "FC Nordstern",
      }),
    ]);
    render(
      <InfoboardScreen1
        feed={feed}
        currentTimeIso="2026-11-01T10:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const card = screen.getByTestId("event-row");
    expect(card.getAttribute(VENUE_ACTIVITY_GRID_DATA_ATTR)).toBe("true");
    expect(card.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="kabine"]`)).toBeTruthy();
    expect(card.querySelector(`[${VENUE_ACTIVITY_COLUMN_ATTR}="platz"]`)).toBeTruthy();
    expect(
      card.querySelector(`[${VENUE_ACTIVITY_ZONE_ATTR}="${VENUE_ACTIVITY_ZONE_CONTEXT}"]`),
    ).toBeTruthy();
  });

  it("match remains symmetric with hierarchy labels on both sides", () => {
    const feed = feedWithEvents([
      makeEvent({
        id: "m1",
        type: "MATCH",
        teamDisplayName: "FC Allschwil",
        opponentDisplayName: "FC Nordstern",
        matchPresentation: {
          home: {
            clubDisplayName: "FC ALLSCHWIL",
            teamSubDisplayName: "JUNIOREN FF-14",
            clubLogoUrl: "/logo.png",
          },
          away: {
            clubDisplayName: "FC NORDSTERN",
            teamSubDisplayName: "FF14_9",
            clubLogoUrl: null,
          },
        },
      }),
    ]);
    render(
      <InfoboardScreen1
        feed={feed}
        currentTimeIso="2026-11-01T10:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    const identity = screen.getByTestId("venue-match-identity");
    expect(identity.getAttribute(VENUE_MATCH_LAYOUT_ATTR)).toBe(VENUE_MATCH_LAYOUT_SYMMETRIC);
    expect(screen.getByTestId("match-home-team-row").textContent).toContain("JUNIOREN FF-14");
    expect(screen.getByTestId("match-away-team-row").textContent).toContain("FF14_9");
    expect(
      scaleVenuePresentationClamp(MATCH_FONT_SIZE_CSS.XLARGE.primary, "spacious"),
    ).not.toBe(MATCH_FONT_SIZE_CSS.XLARGE.primary);
  });

  it("LIGHT and DARK feeds render the same activity count with density attribute", () => {
    const feed = feedWithEvents([
      makeEvent({
        id: "m1",
        type: "MATCH",
        teamDisplayName: "FC Allschwil",
        opponentDisplayName: "FC Nordstern",
      }),
    ]);
    const { unmount } = render(
      <InfoboardScreen1
        feed={feed}
        theme="DARK"
        currentTimeIso="2026-11-01T10:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    expect(screen.getByTestId("event-list").getAttribute(VENUE_PRESENTATION_DENSITY_ATTR)).toBe(
      resolveVenuePresentationDensity(1),
    );
    unmount();
    render(
      <InfoboardScreen1
        feed={feed}
        theme="LIGHT"
        currentTimeIso="2026-11-01T10:00:00.000Z"
        branding={{ clubLogoSrc: "/logo.png" }}
      />,
    );
    expect(screen.getByTestId("event-list").getAttribute(VENUE_PRESENTATION_DENSITY_ATTR)).toBe(
      resolveVenuePresentationDensity(1),
    );
  });
});
