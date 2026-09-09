/**
 * @vitest-environment jsdom
 *
 * INFOBOARD-SCREEN1-VISUAL-01H — hero layout, Platz badge, dense safety.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN1_PRESENTATION,
  TRAINING_FONT_SIZE_CSS,
} from "@/lib/infoboard/screen1-logo-settings";
import {
  buildWednesday20260826Feed,
  resolveWednesdayPreviewCurrentTimeIso,
} from "@/components/infoboard/screen1/wednesday-2026-08-26-fixture";
import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";

const CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);

const BRANDING = {
  clubLogoSrc: "/images/logos/fc-allschwil.png",
  productLogoSrc: "/images/branding/sportclubevo_logo.png",
};

function makeEvent(overrides: Partial<InfoboardScreen1Event> = {}): InfoboardScreen1Event {
  return {
    id: "match-1",
    type: "MATCH",
    displayTitle: "FC Allschwil vs FC Binningen",
    teamDisplayName: "FC ALLSCHWIL",
    opponentDisplayName: "FC BINNINGEN",
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: "Meisterschaft",
    startAt: "2026-08-27T15:00:00.000Z",
    endAt: "2026-08-27T16:45:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "current",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "STADION",
      homeDressingRoomLabel: "Kabine E1",
      awayDressingRoomLabel: "Kabine E2",
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("INFOBOARD-SCREEN1-VISUAL-01H — rendered XL defaults", () => {
  it("applies XLARGE training font CSS variable on the root when using defaults", () => {
    const { container } = render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-08-27T12:00:00.000Z",
          tenant: {
            id: "tenant-1",
            key: "tenant",
            name: "TEST CLUB",
            timezone: "Europe/Zurich",
          },
          displayDate: "2026-08-27",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [],
          next: [makeEvent({ type: "TRAINING", teamDisplayName: "TEAM A" })],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-08-27T12:00:00.000Z"
        presentation={DEFAULT_SCREEN1_PRESENTATION}
      />,
    );

    const root = container.querySelector(
      "[data-testid='infoboard-screen1-root']",
    ) as HTMLElement;
    expect(root.style.getPropertyValue("--ib-training-font-size")).toBe(
      TRAINING_FONT_SIZE_CSS.XLARGE.normal,
    );
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01H — Platz presentation", () => {
  it("renders pitch value without any icon element", () => {
    render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-08-27T12:00:00.000Z",
          tenant: {
            id: "tenant-1",
            key: "tenant",
            name: "TEST CLUB",
            timezone: "Europe/Zurich",
          },
          displayDate: "2026-08-27",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [makeEvent()],
          next: [],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-08-27T14:30:00.000Z"
      />,
    );

    const pitchValue = screen.getByTestId("pitch-value");
    expect(pitchValue.textContent).toBe("STADION");
    expect(pitchValue.querySelector("svg")).toBeNull();
    expect(pitchValue.querySelector("img")).toBeNull();
  });

  it("CSS defines green Platz badge styling without icon pseudo-elements", () => {
    expect(CSS).toMatch(/\.destPitchValue[\s\S]*background:\s*rgba\(26,\s*122,\s*74/);
    expect(CSS).not.toMatch(/\.destPitchValue[\s\S]*::before/);
    expect(CSS).not.toMatch(/pitchIcon|destPitchIcon|LandPlot|MapPin/);
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01H — single-event hero", () => {
  it("uses hero card height rules for a single match", () => {
    expect(CSS).toMatch(
      /\.eventList\[data-count="1"\]:not\(\[data-density="dense"\]\):not\(\[data-density="ultra"\]\)\s+\.eventCard[\s\S]*flex:\s*0\s+0\s+clamp/,
    );
  });

  it("renders one current match with data-count=1", () => {
    render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-08-27T12:00:00.000Z",
          tenant: {
            id: "tenant-1",
            key: "tenant",
            name: "TEST CLUB",
            timezone: "Europe/Zurich",
          },
          displayDate: "2026-08-27",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [makeEvent()],
          next: [],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-08-27T14:30:00.000Z"
      />,
    );

    expect(screen.getByTestId("event-list").getAttribute("data-count")).toBe("1");
    expect(screen.getByTestId("event-list").getAttribute("data-density")).toBe("normal");
    expect(screen.getByText("JETZT")).toBeTruthy();
    expect(screen.getAllByText("FC ALLSCHWIL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("FC BINNINGEN").length).toBeGreaterThan(0);
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01H — dense regression", () => {
  it("dense six-row training cohort remains on the board", () => {
    const nowIso = resolveWednesdayPreviewCurrentTimeIso("18:45");
    const feed = buildWednesday20260826Feed(nowIso);
    render(
      <InfoboardScreen1
        feed={feed}
        branding={BRANDING}
        currentTimeIso={nowIso}
      />,
    );

    const denseCard = screen.getAllByTestId("event-row").find(
      (row) =>
        row.getAttribute("data-type") === "TRAINING"
        && row.getAttribute("data-training-count") === "6",
    );
    expect(denseCard).toBeTruthy();
    if (denseCard instanceof HTMLElement) {
      expect(within(denseCard).getAllByTestId("training-group-row")).toHaveLength(6);
    }
  });
});
