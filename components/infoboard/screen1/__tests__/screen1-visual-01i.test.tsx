/**
 * @vitest-environment jsdom
 *
 * INFOBOARD-SCREEN1-VISUAL-01I — wayfinding badges, grid, training logos, hero.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN1_PRESENTATION,
  TRAINING_KABINE_FONT_SIZE_CSS,
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

describe("INFOBOARD-SCREEN1-VISUAL-01I — grid proportions", () => {
  it("uses stadium wayfinding column proportions 12/36/26/26", () => {
    expect(CSS).toMatch(/--ib-zone-time:\s*12%/);
    expect(CSS).toMatch(/--ib-zone-event:\s*36%/);
    expect(CSS).toMatch(/--ib-zone-room:\s*26%/);
    expect(CSS).toMatch(/--ib-zone-pitch:\s*26%/);
  });

  it("aligns training matrix to parent eventCard columns via subgrid", () => {
    expect(CSS).toMatch(
      /\.eventCard\[data-type="TRAINING"\] \.trainingMatrix[\s\S]*grid-template-columns:\s*subgrid/,
    );
    expect(CSS).toMatch(/\.trainingMatrixRow[\s\S]*grid-template-columns:\s*subgrid/);
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01I — Kabine wayfinding", () => {
  it("renders Kabine room value without icon elements", () => {
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

    const matchAlloc = screen.getByTestId("match-allocation");
    expect(matchAlloc.querySelector("svg")).toBeNull();
    expect(matchAlloc.querySelector("img")).toBeNull();
    expect(screen.getByText("E1")).toBeTruthy();
    expect(screen.getByText("Heim")).toBeTruthy();
  });

  it("CSS defines blue Kabine badge styling without icon pseudo-elements", () => {
    expect(CSS).toMatch(/\.matchAllocRoom[\s\S]*background:\s*rgba\(30,\s*91,\s*198/);
    expect(CSS).not.toMatch(/kabineIcon|destRoomIcon|DoorOpen/);
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01I — Platz wayfinding", () => {
  it("renders pitch value without icon element", () => {
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
});

describe("INFOBOARD-SCREEN1-VISUAL-01I — training presentation", () => {
  it("defaults trainingShowLogos to false", () => {
    expect(DEFAULT_SCREEN1_PRESENTATION.trainingShowLogos).toBe(false);
  });

  it("does not render repetitive FCA crests in dense training by default", () => {
    const nowIso = resolveWednesdayPreviewCurrentTimeIso("18:45");
    const feed = buildWednesday20260826Feed(nowIso);
    render(
      <InfoboardScreen1 feed={feed} branding={BRANDING} currentTimeIso={nowIso} />,
    );

    expect(screen.queryAllByTestId("training-team-logo")).toHaveLength(0);
  });

  it("applies XLARGE Kabine typography token on training cards", () => {
    const { container } = render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-08-27T12:00:00.000Z",
          tenant: {
            id: "tenant-1",
            key: "tenant",
            name: "FC ALLSCHWIL",
            timezone: "Europe/Zurich",
          },
          displayDate: "2026-08-27",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [],
          next: [
            makeEvent({
              type: "TRAINING",
              teamDisplayName: "FC ALLSCHWIL JUNIOREN E3",
              allocation: {
                pitchLabel: "KR 3 – FELD A",
                homeDressingRoomLabel: "Kabine E3",
                awayDressingRoomLabel: null,
                refereeDressingRoomLabel: null,
              },
            }),
          ],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-08-27T12:00:00.000Z"
      />,
    );

    const card = container.querySelector("[data-type='TRAINING']") as HTMLElement;
    expect(card.style.getPropertyValue("--ib-training-kabine-font-size")).toBe(
      TRAINING_KABINE_FONT_SIZE_CSS.XLARGE,
    );
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01I — sparse hero and dense safety", () => {
  it("uses hero card height rules for a single match", () => {
    expect(CSS).toMatch(
      /\.eventList\[data-count="1"\][\s\S]*\.eventCard[\s\S]*flex:\s*0\s+0\s+clamp/,
    );
  });

  it("equalizes match opponent typography in single-event hero CSS", () => {
    expect(CSS).toMatch(
      /\.eventList\[data-count="1"\][\s\S]*\.eventTeamOpponent[\s\S]*font-weight:\s*700/,
    );
  });

  it("dense six-row training cohort remains on the board", () => {
    const nowIso = resolveWednesdayPreviewCurrentTimeIso("18:45");
    const feed = buildWednesday20260826Feed(nowIso);
    render(
      <InfoboardScreen1 feed={feed} branding={BRANDING} currentTimeIso={nowIso} />,
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
