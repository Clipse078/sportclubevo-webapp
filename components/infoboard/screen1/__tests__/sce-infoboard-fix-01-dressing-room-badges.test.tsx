/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-FIX-01 — dressing-room badge rendering regression suite.
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import type {
  InfoboardScreen1Feed,
  InfoboardScreen1Event,
} from "@/lib/publishing/event-types";
import { DressingRoomBadges } from "@/components/infoboard/screen1/DressingRoomBadges";
import { ALLOCATION_LIST_SEPARATOR } from "@/lib/publishing/presentation/allocation-display-resolver";

const BRANDING = { clubLogoSrc: "/images/logos/fc-allschwil.png" as const };

function makeFeed(
  events: InfoboardScreen1Event[],
  overrides: Partial<InfoboardScreen1Feed> = {},
): InfoboardScreen1Feed {
  return {
    generatedAt: "2026-09-12T08:30:00.000Z",
    tenant: {
      id: "tenant-fca",
      key: "fca",
      name: "FC Allschwil",
      timezone: "Europe/Zurich",
    },
    displayDate: "2026-09-12",
    isStale: false,
    wochenplanVariantBadge: null,
    current: events,
    next: [],
    later: [],
    isEmpty: events.length === 0,
    emptyStateReason: events.length === 0 ? "NO_EVENTS_TODAY" : null,
    ...overrides,
  };
}

function trainingEvent(
  overrides: Partial<InfoboardScreen1Event> = {},
): InfoboardScreen1Event {
  return {
    id: "tr-1",
    type: "TRAINING",
    displayTitle: "Training",
    teamDisplayName: "Juniorinnen FF-14",
    opponentDisplayName: null,
    opponentLogoUrl: null,
    matchPresentation: null,
    organizerDisplayName: null,
    competitionLabel: null,
    startAt: "2026-09-12T17:00:00.000Z",
    endAt: "2026-09-12T18:30:00.000Z",
    meetingTime: null,
    status: "SCHEDULED",
    resultLabel: null,
    intermediateResultLabel: null,
    temporalBucket: "current",
    allocation: {
      pitchLabel: "KR 2 - FELD A",
      homeDressingRoomLabel: "E1",
      awayDressingRoomLabel: null,
      refereeDressingRoomLabel: null,
    },
    ...overrides,
  };
}

describe("SCE-INFOBOARD-FIX-01 dressing-room badges", () => {
  it("renders one badge for a single dressing room", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([trainingEvent()])}
        branding={BRANDING}
        currentTimeIso="2026-09-12T17:05:00.000Z"
      />,
    );
    expect(screen.getByText("E1")).toBeTruthy();
    expect(screen.queryByTestId("dressing-room-badge-group")).toBeNull();
  });

  it("renders separate badges for two dressing rooms (FCA Juniorinnen FF-14 scenario)", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([
          trainingEvent({
            teamDisplayName: "Juniorinnen FF-14",
            allocation: {
              pitchLabel: "KR 2 - FELD A",
              homeDressingRoomLabel: `E1${ALLOCATION_LIST_SEPARATOR}O3`,
              awayDressingRoomLabel: null,
              refereeDressingRoomLabel: null,
            },
          }),
        ])}
        branding={BRANDING}
        currentTimeIso="2026-09-12T17:05:00.000Z"
      />,
    );
    const group = screen.getByTestId("dressing-room-badge-group");
    expect(group.getAttribute("data-dressing-room-count")).toBe("2");
    expect(within(group).getByText("E1")).toBeTruthy();
    expect(within(group).getByText("O3")).toBeTruthy();
    expect(screen.queryByText(`E1${ALLOCATION_LIST_SEPARATOR}O3`)).toBeNull();
  });

  it("renders three or more dressing-room badges", () => {
    render(
      <DressingRoomBadges
        label={`E1${ALLOCATION_LIST_SEPARATOR}O3${ALLOCATION_LIST_SEPARATOR}O4`}
        badgeClassName="badge"
      />,
    );
    const group = screen.getByTestId("dressing-room-badge-group");
    expect(group.getAttribute("data-dressing-room-count")).toBe("3");
    expect(within(group).getByText("E1")).toBeTruthy();
    expect(within(group).getByText("O3")).toBeTruthy();
    expect(within(group).getByText("O4")).toBeTruthy();
  });

  it("renders long room identifiers without concatenating into one overlapping pill", () => {
    const long = "KABINE-ERDGESCHOSS-LANGE-BEZEICHNUNG";
    render(<DressingRoomBadges label={long} badgeClassName="badge" />);
    expect(screen.getByText(long)).toBeTruthy();
    expect(screen.queryByTestId("dressing-room-badge-group")).toBeNull();
  });

  it("shows unassigned warning when dressing room is missing", () => {
    render(
      <InfoboardScreen1
        feed={makeFeed([
          trainingEvent({
            allocation: {
              pitchLabel: "KR 2",
              homeDressingRoomLabel: null,
              awayDressingRoomLabel: null,
              refereeDressingRoomLabel: null,
            },
          }),
        ])}
        branding={BRANDING}
        currentTimeIso="2026-09-12T17:05:00.000Z"
      />,
    );
    expect(screen.getByTestId("dressing-room-unassigned-warning")).toBeTruthy();
  });

  it("renders duplicate assignments as distinct badges when present in the label", () => {
    render(
      <DressingRoomBadges
        label={`E1${ALLOCATION_LIST_SEPARATOR}E1`}
        badgeClassName="badge"
      />,
    );
    const group = screen.getByTestId("dressing-room-badge-group");
    expect(group.querySelectorAll(".badge")).toHaveLength(2);
  });

  it("strips Kabine prefix per room part", () => {
    render(
      <DressingRoomBadges
        label={`Kabine E1${ALLOCATION_LIST_SEPARATOR}Kabine O3`}
        badgeClassName="badge"
      />,
    );
    const group = screen.getByTestId("dressing-room-badge-group");
    expect(within(group).getByText("E1")).toBeTruthy();
    expect(within(group).getByText("O3")).toBeTruthy();
  });
});
