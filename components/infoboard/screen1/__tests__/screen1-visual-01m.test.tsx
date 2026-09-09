/**
 * @vitest-environment jsdom
 *
 * INFOBOARD-SCREEN1-VISUAL-01M — canonical Kabine pill size parity.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN1_PRESENTATION,
  MATCH_KABINE_FONT_SIZE_CSS,
  TOURNAMENT_KABINE_FONT_SIZE_CSS,
  TRAINING_KABINE_FONT_SIZE_CSS,
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

function cssBlock(selector: string): string {
  const start = CSS.indexOf(selector);
  expect(start, `Missing CSS selector ${selector}`).toBeGreaterThanOrEqual(0);
  return CSS.slice(start, CSS.indexOf("}", start));
}

function sharedKabinePillBlock(): string {
  const marker = ".matchAllocRoom,\n.trainingGroupRoomValue";
  const start = CSS.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  return CSS.slice(start, CSS.indexOf("}", start));
}

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
    { id: "p1", teamDisplayName: "FC ALLSCHWIL E2", dressingRoomLabel: "Kabine 02" },
    { id: "p2", teamDisplayName: "FC ALLSCHWIL E3", dressingRoomLabel: "Kabine 03" },
    { id: "p3", teamDisplayName: "FC PRATTELN", dressingRoomLabel: "Kabine E3" },
    { id: "p4", teamDisplayName: "FC LAUSEN 72", dressingRoomLabel: "Kabine O4" },
  ];
}

afterEach(() => {
  cleanup();
});

describe("INFOBOARD-SCREEN1-VISUAL-01M — canonical Kabine pill CSS", () => {
  it("defines a shared Kabine badge width token at root", () => {
    expect(CSS).toMatch(/--ib-kabine-badge-width:\s*clamp\(52px,\s*4\.8vw,\s*76px\)/);
    expect(CSS).toMatch(
      /--ib-tournament-kabine-badge-width:\s*var\(--ib-kabine-badge-width\)/,
    );
  });

  it("applies canonical pill geometry to training, match, and tournament selectors", () => {
    const shared = sharedKabinePillBlock();
    expect(shared).toMatch(/width:\s*var\(--ib-kabine-badge-width\)/);
    expect(shared).toMatch(/min-width:\s*var\(--ib-kabine-badge-width\)/);
    expect(shared).toMatch(/max-width:\s*var\(--ib-kabine-badge-width\)/);
    expect(shared).toMatch(/line-height:\s*1/);
    expect(shared).toMatch(/text-align:\s*center/);
  });

  it("does not keep event-specific Kabine width overrides on match pills", () => {
    const matchBlock = cssBlock(".matchAllocRoom {");
    expect(matchBlock).not.toMatch(/min-width:\s*clamp\(44px/);
    expect(matchBlock).not.toMatch(/line-height:\s*1\.1/);
  });

  it("does not shrink training Kabine pills in compact or dense group density", () => {
    expect(CSS).not.toMatch(
      /\.eventCard\[data-type="TRAINING"\]\[data-group-density="compact"\] \.trainingGroupRoomValue/,
    );
    expect(CSS).not.toMatch(
      /\.eventCard\[data-type="TRAINING"\]\[data-group-density="dense"\] \.trainingGroupRoomValue/,
    );
  });

  it("uses the canonical font-size fallback for all event-type Kabine pills", () => {
    for (const selector of [
      ".matchAllocRoom {",
      ".trainingGroupRoomValue {",
      ".participantRoomValue {",
    ]) {
      const block = cssBlock(selector);
      expect(block).toMatch(
        /font-size:\s*var\(--ib-(match|training|tournament)-kabine-font-size,\s*var\(--ib-kabine-font-size-fallback\)\)/,
      );
    }
  });

  it("preserves tournament multi-room width escape hatch", () => {
    expect(CSS).toMatch(
      /\.participantRoomValue\[data-multi-room="true"\][\s\S]*width:\s*auto/,
    );
  });

  it("preserves 01L training matrix vertical centering", () => {
    expect(CSS).toMatch(
      /\.eventCard\[data-type="TRAINING"\] \.trainingMatrix[\s\S]*height:\s*100%/,
    );
    expect(CSS).toMatch(
      /\.eventCard\[data-type="TRAINING"\] \.trainingMatrix[\s\S]*align-content:\s*safe center/,
    );
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01M — rendered Kabine pill parity", () => {
  const tenant = {
    id: "tenant-1",
    key: "tenant",
    name: "FC ALLSCHWIL",
    timezone: "Europe/Zurich",
  };

  it("renders match HEIM/GAST Kabine pills with numeric and alphanumeric values", () => {
    render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-08-27T12:00:00.000Z",
          tenant,
          displayDate: "2026-08-27",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [makeMatch({ id: "match-row" })],
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

    const matchAllocation = screen.getByTestId("match-allocation");
    expect(within(matchAllocation).getByText("04")).toBeTruthy();
    expect(within(matchAllocation).getByText("E3")).toBeTruthy();
    expect(within(matchAllocation).getByText("Heim")).toBeTruthy();
    expect(within(matchAllocation).getByText("Gast")).toBeTruthy();
  });

  it("renders tournament and multi-row training Kabine values", () => {
    render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-08-27T12:00:00.000Z",
          tenant,
          displayDate: "2026-08-27",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [makeTournament({ id: "tournament-row" })],
          next: [
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
        eventPresentation={[
          { eventId: "tournament-row", participantAllocations: kabineAllocations() },
        ]}
        presentation={DEFAULT_SCREEN1_PRESENTATION}
        studio={EMPTY_SCREEN1_STUDIO_CONFIG}
      />,
    );

    const tournamentBlock = screen.getByTestId("participant-allocation-block");
    expect(within(tournamentBlock).getByText("02")).toBeTruthy();
    expect(within(tournamentBlock).getByText("03")).toBeTruthy();
    expect(within(tournamentBlock).getByText("E3")).toBeTruthy();
    expect(within(tournamentBlock).getByText("O4")).toBeTruthy();

    const trainingCard = screen
      .getAllByTestId("event-row")
      .find((row) => row.getAttribute("data-type") === "TRAINING");
    expect(trainingCard).toBeTruthy();
    expect(within(trainingCard).getByText("02")).toBeTruthy();
    expect(within(trainingCard).getByText("03")).toBeTruthy();
  });

  it("applies identical XLARGE Kabine font-size variables on all card types", () => {
    const matchRender = render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-08-27T12:00:00.000Z",
          tenant,
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
    const matchKabineFont = (
      matchRender.container.querySelector("[data-type='MATCH']") as HTMLElement
    ).style.getPropertyValue("--ib-match-kabine-font-size");
    cleanup();

    const tournamentRender = render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-09-12T08:00:00.000Z",
          tenant,
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
    const tournamentKabineFont = (
      tournamentRender.container.querySelector("[data-type='TOURNAMENT']") as HTMLElement
    ).style.getPropertyValue("--ib-tournament-kabine-font-size");
    cleanup();

    const trainingRender = render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-08-27T12:00:00.000Z",
          tenant,
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
    const trainingKabineFont = (
      trainingRender.container.querySelector("[data-type='TRAINING']") as HTMLElement
    ).style.getPropertyValue("--ib-training-kabine-font-size");

    expect(matchKabineFont).toBe(MATCH_KABINE_FONT_SIZE_CSS.XLARGE);
    expect(tournamentKabineFont).toBe(TOURNAMENT_KABINE_FONT_SIZE_CSS.XLARGE);
    expect(trainingKabineFont).toBe(TRAINING_KABINE_FONT_SIZE_CSS.XLARGE);
    expect(matchKabineFont).toBe(tournamentKabineFont);
    expect(trainingKabineFont).toBe(tournamentKabineFont);
  });
});
