/**
 * @vitest-environment jsdom
 *
 * INFOBOARD-SCREEN1-VISUAL-01J — tournament title prominence + Kabine alignment.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN1_PRESENTATION,
  TOURNAMENT_FONT_SIZE_CSS,
  TOURNAMENT_KABINE_FONT_SIZE_CSS,
} from "@/lib/infoboard/screen1-logo-settings";
import {
  PREVIEW_FIXTURE_TOURNAMENT_4TEAM,
  PREVIEW_TOURNAMENT_4TEAM_EXTENSIONS,
} from "@/components/infoboard/screen1/screen1-preview-fixture";
import type { InfoboardScreen1Event } from "@/lib/publishing/event-types";
import type { InfoboardTeamAllocationPresentation } from "@/components/infoboard/screen1/screen1-presentation-types";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";

const CSS = readFileSync(
  resolve(process.cwd(), "components/infoboard/screen1/InfoboardScreen1.module.css"),
  "utf8",
);

const BRANDING = {
  clubLogoSrc: "/images/logos/fc-allschwil.png",
  productLogoSrc: "/images/branding/sportclubevo_logo.png",
};

function makeTournamentEvent(
  overrides: Partial<InfoboardScreen1Event> = {},
): InfoboardScreen1Event {
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

function makeKabineAllocations(): readonly InfoboardTeamAllocationPresentation[] {
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

describe("INFOBOARD-SCREEN1-VISUAL-01J — tournament title prominence", () => {
  it("uses strengthened XLARGE tournament title token comparable to training identity", () => {
    expect(TOURNAMENT_FONT_SIZE_CSS.XLARGE).toBe("clamp(2rem, 2.8vw, 3.2rem)");
    expect(DEFAULT_SCREEN1_PRESENTATION.tournamentFontSize).toBe("XLARGE");
  });

  it("keeps tournament title wired to --ib-tournament-font-size variable", () => {
    expect(CSS).toMatch(/\.tournamentTitle[\s\S]*font-size:\s*var\(--ib-tournament-font-size\)/);
  });

  it("scales sparse single-event tournament hero title above normal multi-event", () => {
    expect(CSS).toMatch(
      /\.eventList\[data-count="1"\][\s\S]*\.eventCard\[data-type="TOURNAMENT"\][\s\S]*\.tournamentTitle[\s\S]*font-size:\s*clamp\(2\.4rem,\s*3\.2vw,\s*3\.8rem\)/,
    );
  });

  it("preserves two-line clamp and safe wrapping on tournament title", () => {
    expect(CSS).toMatch(/\.tournamentTitle[\s\S]*-webkit-line-clamp:\s*2/);
    expect(CSS).toMatch(/\.tournamentTitle[\s\S]*overflow-wrap:\s*normal/);
  });

  it("renders tournament title with dedicated class separate from eyebrow", () => {
    render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-09-12T08:00:00.000Z",
          tenant: {
            id: "tenant-1",
            key: "tenant",
            name: "TEST CLUB",
            timezone: "Europe/Zurich",
          },
          displayDate: "2026-09-12",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [makeTournamentEvent()],
          next: [],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-09-12T09:00:00.000Z"
      />,
    );

    expect(screen.getByText("TURNIER")).toBeTruthy();
    const title = screen.getByText("BRACK.CH PLAYMORE TURNIER");
    expect(title.className).toContain("tournamentTitle");
  });
});

describe("INFOBOARD-SCREEN1-VISUAL-01J — tournament Kabine alignment", () => {
  it("defines a fixed Kabine column on the participant allocation grid", () => {
    expect(CSS).toMatch(
      /\.participantAllocationBlock[\s\S]*grid-template-columns:\s*var\(--ib-kabine-badge-width\)\s*minmax\(0,\s*1fr\)/,
    );
    expect(CSS).toMatch(/--ib-kabine-badge-width:\s*clamp\(52px,\s*4\.8vw,\s*76px\)/);
  });

  it("uses display:contents rows so badges share one Kabine column", () => {
    expect(CSS).toMatch(/\.participantAllocationRow[\s\S]*display:\s*contents/);
  });

  it("standardizes single-room badge width and centers room values", () => {
    expect(CSS).toMatch(
      /\.matchAllocRoom,\s*\n\.trainingGroupRoomValue,\s*\n\.participantRoomValue[\s\S]*width:\s*var\(--ib-kabine-badge-width\)/,
    );
    expect(CSS).toMatch(
      /\.matchAllocRoom,\s*\n\.trainingGroupRoomValue,\s*\n\.participantRoomValue[\s\S]*min-width:\s*var\(--ib-kabine-badge-width\)/,
    );
    expect(CSS).toMatch(
      /\.matchAllocRoom,\s*\n\.trainingGroupRoomValue,\s*\n\.participantRoomValue[\s\S]*max-width:\s*var\(--ib-kabine-badge-width\)/,
    );
    expect(CSS).toMatch(
      /\.matchAllocRoom,\s*\n\.trainingGroupRoomValue,\s*\n\.participantRoomValue[\s\S]*text-align:\s*center/,
    );
  });

  it("allows deliberate wider multi-room badges without truncating values", () => {
    expect(CSS).toMatch(
      /\.participantRoomValue\[data-multi-room="true"\][\s\S]*width:\s*auto/,
    );
  });

  it("renders numeric and alphanumeric Kabine values in allocation block", () => {
    render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-09-12T08:00:00.000Z",
          tenant: {
            id: "tenant-1",
            key: "tenant",
            name: "TEST CLUB",
            timezone: "Europe/Zurich",
          },
          displayDate: "2026-09-12",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [makeTournamentEvent({ id: "kabine-align" })],
          next: [],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-09-12T09:00:00.000Z"
        eventPresentation={[
          {
            eventId: "kabine-align",
            participantAllocations: makeKabineAllocations(),
          },
        ]}
      />,
    );

    const block = screen.getByTestId("participant-allocation-block");
    expect(within(block).getByText("03")).toBeTruthy();
    expect(within(block).getByText("04")).toBeTruthy();
    expect(within(block).getByText("E1")).toBeTruthy();
    expect(within(block).getByText("E2")).toBeTruthy();
    expect(within(block).getByText("FC ALLSCHWIL E2")).toBeTruthy();
    expect(within(block).getByText("FC LAUSEN 72")).toBeTruthy();
  });

  it("marks multi-room tournament badges without removing the assignment", () => {
    render(
      <InfoboardScreen1
        feed={{
          generatedAt: "2026-09-12T08:00:00.000Z",
          tenant: {
            id: "tenant-1",
            key: "tenant",
            name: "TEST CLUB",
            timezone: "Europe/Zurich",
          },
          displayDate: "2026-09-12",
          isStale: false,
          wochenplanVariantBadge: null,
          current: [makeTournamentEvent({ id: "multi-room" })],
          next: [],
          later: [],
          isEmpty: false,
          emptyStateReason: null,
        }}
        branding={BRANDING}
        currentTimeIso="2026-09-12T09:00:00.000Z"
        eventPresentation={[
          {
            eventId: "multi-room",
            participantAllocations: [
              { id: "mr-1", teamDisplayName: "FC TEST", dressingRoomLabel: "Kabine E1 · O3" },
              { id: "mr-2", teamDisplayName: "FC OTHER", dressingRoomLabel: "Kabine 03" },
            ],
          },
        ]}
      />,
    );

    const multiRoomBadge = screen.getByText("E1 · O3");
    expect(multiRoomBadge.getAttribute("data-multi-room")).toBe("true");
    expect(screen.getByText("03").getAttribute("data-multi-room")).toBeNull();
  });

  it("preserves XLARGE tournament Kabine typography default", () => {
    const { container } = render(
      <InfoboardScreen1
        feed={PREVIEW_FIXTURE_TOURNAMENT_4TEAM}
        branding={BRANDING}
        currentTimeIso="2026-09-12T08:30:00.000Z"
        eventPresentation={PREVIEW_TOURNAMENT_4TEAM_EXTENSIONS}
      />,
    );

    const card = container.querySelector("[data-type='TOURNAMENT']") as HTMLElement;
    expect(card.style.getPropertyValue("--ib-tournament-kabine-font-size")).toBe(
      TOURNAMENT_KABINE_FONT_SIZE_CSS.XLARGE,
    );
  });

  it("does not alter match Kabine row geometry contract", () => {
    expect(CSS).toMatch(/\.matchAllocRow[\s\S]*display:\s*flex/);
    expect(CSS).toMatch(
      /\.matchAllocRoom,\s*\n\.trainingGroupRoomValue,\s*\n\.participantRoomValue[\s\S]*min-width:\s*var\(--ib-kabine-badge-width\)/,
    );
  });
});
