/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R1 — semantic LIGHT V2 presentation contract (no screenshots).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { EMPTY_SCREEN1_STUDIO_CONFIG } from "@/lib/infoboard/screen1-studio-types";
import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";

const BRANDING = {
  clubLogoSrc: "/images/logos/fc-allschwil.png",
  productLogoSrc: "/images/branding/sportclubevo_logo.png",
};

function makeFeed(event: InfoboardScreen1Event) {
  return {
    tenant: { id: "t1", name: "FC Allschwil", timezone: "Europe/Zurich" },
    displayDate: "2026-11-01",
    generatedAt: "2026-11-01T08:00:00.000Z",
    isEmpty: false,
    emptyStateReason: null as const,
    current: [event],
    next: [],
    later: [],
  };
}

function makeTraining(): InfoboardScreen1Event {
  return {
    id: "training-1",
    type: "TRAINING",
    displayTitle: "JUNIOREN F2",
    teamDisplayName: "FC ALLSCHWIL JUNIOREN F2",
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: null,
    startAt: "2026-11-01T14:00:00.000Z",
    endAt: "2026-11-01T15:30:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "current",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "KR 1",
      homeDressingRoomLabel: "05",
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
  };
}

describe("Preview LIGHT V2 presentation contract", () => {
  it("LIGHT uses data-theme light, venue heading, unified grid, no legacy subtitle band", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed(makeTraining())}
        branding={BRANDING}
        theme="LIGHT"
        currentTimeIso="2026-11-01T08:00:00.000Z"
        headerConfig={{
          subtitleEnabled: true,
          subtitleText: "Willkommen auf der Anlage",
          pageHeadingText: "HEUTE IM BRÜEL",
        }}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const root = screen.getByTestId("infoboard-screen1-root");
    expect(root.getAttribute("data-theme")).toBe("light");
    expect(screen.getByTestId("venue-page-heading").textContent).toContain(
      "HEUTE IM BRÜEL",
    );
    expect(screen.queryByTestId("board-title")).toBeNull();
    expect(screen.getByTestId("event-row").getAttribute("data-venue-activity-grid")).toBe(
      "true",
    );
  });

  it("DARK keeps legacy subtitle band contract", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed(makeTraining())}
        branding={BRANDING}
        theme="DARK"
        currentTimeIso="2026-11-01T08:00:00.000Z"
        headerConfig={{
          subtitleEnabled: true,
          subtitleText: "HEUTE AUF DER SPORTANLAGE",
        }}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const root = screen.getByTestId("infoboard-screen1-root");
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(screen.getByTestId("board-title")).toBeTruthy();
    expect(screen.queryByTestId("venue-page-heading")).toBeNull();
  });
});
