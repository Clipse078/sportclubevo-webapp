/**
 * @vitest-environment jsdom
 *
 * INFOBOARD-SCREEN1-VISUAL-01K — global Kabine alignment + XL Standard rendering.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN1_PRESENTATION,
  MATCH_KABINE_FONT_SIZE_CSS,
  MATCH_LOGO_SIZE_CSS,
  MATCH_PLATZ_FONT_SIZE_CSS,
  TOURNAMENT_KABINE_FONT_SIZE_CSS,
  TOURNAMENT_LOGO_SIZE_CSS,
  TOURNAMENT_PLATZ_FONT_SIZE_CSS,
  TRAINING_KABINE_FONT_SIZE_CSS,
  TRAINING_PLATZ_FONT_SIZE_CSS,
} from "@/lib/infoboard/screen1-logo-settings";
import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";
import type { InfoboardTeamAllocationPresentation } from "@/components/infoboard/screen1/screen1-presentation-types";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { EMPTY_SCREEN1_STUDIO_CONFIG } from "@/lib/infoboard/screen1-studio-types";

const CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);

const BRANDING = {
  clubLogoSrc: "/images/logos/fc-allschwil.png",
  productLogoSrc: "/images/branding/sportclubevo_logo.png",
};

function makeMatch(overrides: Partial<InfoboardScreen1Event> = {}): InfoboardScreen1Event {
  return {
    id: "match-1",
    type: "MATCH",
    displayTitle: "FC ALLSCHWIL B1 vs SC BINNINGEN",
    teamDisplayName: "FC ALLSCHWIL B1",
    opponentDisplayName: "SC BINNINGEN",
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: "Meisterschaft",
    startAt: "2026-08-27T18:30:00.000Z",
    endAt: "2026-08-27T20:15:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2025-26",
    allocation: {
      pitchLabel: "KR 2",
      homeDressingRoomLabel: "Kabine 04",
      awayDressingRoomLabel: "Kabine E3",
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

function makeTournament(overrides: Partial<InfoboardScreen1Event> = {}): InfoboardScreen1Event {
  return {
    id: "tournament-1",
    type: "TOURNAMENT",
    displayTitle: "BRACK.CH PLAYMORE TURNIER",
    teamDisplayName: null,
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: "BRACK.CH",
    competitionLabel: "Turnier",
    startAt: "2026-09-12T10:00:00.000Z",
    endAt: null,
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "next",
    seasonKey: "2026-27",
    allocation: {
      pitchLabel: "KR 2",
      homeDressingRoomLabel: null,
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

function kabineAllocations(): readonly InfoboardTeamAllocationPresentation[] {
  return [
    { id: "p1", teamDisplayName: "FC ALLSCHWIL E2", dressingRoomLabel: "Kabine 03" },
    { id: "p2", teamDisplayName: "FC ALLSCHWIL E3", dressingRoomLabel: "Kabine 04" },
    { id: "p3", teamDisplayName: "FC PRATTELN", dressingRoomLabel: "Kabine E1" },
    { id: "p4", teamDisplayName: "FC LAUSEN 72", dressingRoomLabel: "Kabine E2" },
  ];
}

afterEach(() => {
  cleanup();
});

describe("INFOBOARD-SCREEN1-VISUAL-01K — canonical grid alignment", () => {
  it("training matrix inherits parent eventCard columns via subgrid", () => {
    expect(CSS).toMatch(
      /\.eventCard\[data-type="TRAINING"\] \.trainingMatrix[\s\S]*grid-template-columns:\s*subgrid/,
    );
    expect(CSS).toMatch(/\.trainingMatrixRow[\s\S]*grid-template-columns:\s*subgrid/);
    expect(CSS).toMatch(/\.trainingRowMatrix[\s\S]*grid-template-columns:\s*subgrid/);
  });

  it("defines shared Kabine and Platz column anchor classes", () => {
    expect(CSS).toMatch(/\.cardKabineColumn,\s*\n\.cardDressingRoomZone/);
    expect(CSS).toMatch(/\.cardPlatzColumn,\s*\n\.cardPitchZone/);
  });

  it("removes nested horizontal inset padding from training matrix containers", () => {
    expect(CSS).toMatch(/\.trainingMatrixHeaders[\s\S]*padding:\s*var\(--ib-card-pad-v\)\s+0\s+0/);
    expect(CSS).not.toMatch(/\.trainingRowMatrix[\s\S]*padding:\s*0 var\(--ib-card-pad-h\)/);
  });

  it("applies per-column borders on training Kabine and Platz cells", () => {
    expect(CSS).toMatch(/\.trainingMatrixCell:nth-child\(2\)[\s\S]*border-left/);
    expect(CSS).toMatch(/\.trainingMatrixCell:nth-child\(3\)[\s\S]*border-left/);
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01K — rendered XL defaults", () => {
  it("match card applies XLARGE kabine, platz, and logo CSS variables by default", () => {
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
          current: [makeMatch()],
          next: [],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-08-27T17:00:00.000Z"
        presentation={DEFAULT_SCREEN1_PRESENTATION}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const card = container.querySelector("[data-type='MATCH']") as HTMLElement;
    expect(card.style.getPropertyValue("--ib-match-kabine-font-size")).toBe(
      MATCH_KABINE_FONT_SIZE_CSS.XLARGE,
    );
    expect(card.style.getPropertyValue("--ib-match-platz-font-size")).toBe(
      MATCH_PLATZ_FONT_SIZE_CSS.XLARGE,
    );
    expect(card.style.getPropertyValue("--ib-match-logo-size")).toBe(MATCH_LOGO_SIZE_CSS.XLARGE);
  });

  it("tournament card applies XLARGE kabine, platz, and logo CSS variables by default", () => {
    const { container } = render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-09-12T08:00:00.000Z",
          tenant: {
            id: "tenant-1",
            key: "tenant",
            name: "FC ALLSCHWIL",
            timezone: "Europe/Zurich",
          },
          displayDate: "2026-09-12",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [makeTournament()],
          next: [],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-09-12T09:00:00.000Z"
        eventPresentation={[
          { eventId: "tournament-1", participantAllocations: kabineAllocations() },
        ]}
        presentation={DEFAULT_SCREEN1_PRESENTATION}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const card = container.querySelector("[data-type='TOURNAMENT']") as HTMLElement;
    expect(card.style.getPropertyValue("--ib-tournament-kabine-font-size")).toBe(
      TOURNAMENT_KABINE_FONT_SIZE_CSS.XLARGE,
    );
    expect(card.style.getPropertyValue("--ib-tournament-platz-font-size")).toBe(
      TOURNAMENT_PLATZ_FONT_SIZE_CSS.XLARGE,
    );
    expect(card.style.getPropertyValue("--ib-tournament-logo-size")).toBe(
      TOURNAMENT_LOGO_SIZE_CSS.XLARGE,
    );
  });

  it("training card applies XLARGE kabine and platz CSS variables by default", () => {
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
            makeMatch({
              id: "t1",
              type: "TRAINING",
              teamDisplayName: "2. MANNSCHAFT",
              opponentDisplayName: null,
              competitionLabel: null,
              startAt: "2026-08-27T18:15:00.000Z",
              allocation: {
                pitchLabel: "KR 3 – FELD A",
                homeDressingRoomLabel: "Kabine 01",
                awayDressingRoomLabel: null,
                refereeDressingRoomLabel: null,
              },
            }),
            makeMatch({
              id: "t2",
              type: "TRAINING",
              teamDisplayName: "FRAUEN 1",
              opponentDisplayName: null,
              competitionLabel: null,
              startAt: "2026-08-27T18:15:00.000Z",
              allocation: {
                pitchLabel: "KR 3 – FELD A",
                homeDressingRoomLabel: "Kabine 03",
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
        currentTimeIso="2026-08-27T17:00:00.000Z"
        presentation={DEFAULT_SCREEN1_PRESENTATION}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const card = container.querySelector("[data-type='TRAINING']") as HTMLElement;
    expect(card.style.getPropertyValue("--ib-training-kabine-font-size")).toBe(
      TRAINING_KABINE_FONT_SIZE_CSS.XLARGE,
    );
    expect(card.style.getPropertyValue("--ib-training-platz-font-size")).toBe(
      TRAINING_PLATZ_FONT_SIZE_CSS.XLARGE,
    );
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01K — Kabine column content", () => {
  it("renders KABINE and PLATZ labels on match and tournament cards", () => {
    render(
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
          current: [makeMatch({ id: "match-row" }), makeTournament({ id: "tournament-row" })],
          next: [],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-08-27T17:00:00.000Z"
        eventPresentation={[
          { eventId: "tournament-row", participantAllocations: kabineAllocations() },
        ]}
      />,
    );

    for (const row of screen.getAllByTestId("event-row")) {
      expect(within(row).getByText("KABINE")).toBeTruthy();
      expect(within(row).getByText("PLATZ")).toBeTruthy();
    }

    expect(within(screen.getByTestId("match-allocation")).getByText("04")).toBeTruthy();
    expect(within(screen.getByTestId("match-allocation")).getByText("Heim")).toBeTruthy();
    const block = screen.getByTestId("participant-allocation-block");
    expect(within(block).getByText("03")).toBeTruthy();
  });

  it("renders KABINE and PLATZ labels on grouped training cards", () => {
    render(
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
          current: [
            makeMatch({
              id: "t-train-1",
              type: "TRAINING",
              teamDisplayName: "JUNIOREN B2",
              opponentDisplayName: null,
              competitionLabel: null,
              startAt: "2026-08-27T18:15:00.000Z",
              allocation: {
                pitchLabel: "KR 3 – FELD B",
                homeDressingRoomLabel: "Kabine 02",
                awayDressingRoomLabel: null,
                refereeDressingRoomLabel: null,
              },
            }),
            makeMatch({
              id: "t-train-2",
              type: "TRAINING",
              teamDisplayName: "TEAM B",
              opponentDisplayName: null,
              competitionLabel: null,
              startAt: "2026-08-27T18:15:00.000Z",
              allocation: {
                pitchLabel: "KR 3",
                homeDressingRoomLabel: "Kabine 02",
                awayDressingRoomLabel: null,
                refereeDressingRoomLabel: null,
              },
            }),
          ],
          next: [],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-08-27T17:00:00.000Z"
      />,
    );

    const trainingRow = screen.getByTestId("event-row");
    expect(trainingRow.getAttribute("data-type")).toBe("TRAINING");
    expect(within(trainingRow).getByText("KABINE")).toBeTruthy();
    expect(within(trainingRow).getByText("PLATZ")).toBeTruthy();
    expect(screen.getByTestId("training-matrix-headers")).toBeTruthy();
  });

  it("preserves tournament participant-name alignment and equal badge width", () => {
    expect(CSS).toMatch(
      /\.participantAllocationBlock[\s\S]*grid-template-columns:\s*var\(--ib-kabine-badge-width\)/,
    );
    expect(CSS).toMatch(
      /\.matchAllocRoom,\s*\n\.trainingGroupRoomValue,\s*\n\.participantRoomValue[\s\S]*width:\s*var\(--ib-kabine-badge-width\)/,
    );
  });
});
