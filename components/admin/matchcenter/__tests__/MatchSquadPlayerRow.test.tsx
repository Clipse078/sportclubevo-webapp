/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MatchSquadPlayerPresentation } from "@/lib/match-squad/types";
import MatchSquadPlayerRow from "../MatchSquadPlayerRow";
import {
  MATCH_SQUAD_PLAYER_ROW_GRID_CLASS,
  MATCH_SQUAD_PLAYER_ROW_LAYOUT,
  MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS,
} from "../match-squad-player-row-layout";

vi.mock("@/components/admin/matchcenter/MatchAvailabilityTrainerRecordMenu", () => ({
  default: () => <div data-testid="trainer-record-menu" />,
}));

function player(
  overrides: Partial<MatchSquadPlayerPresentation> = {},
): MatchSquadPlayerPresentation {
  return {
    personId: "p1",
    displayName: "SCE Testspieler 01",
    shirtNumber: 1,
    sortOrder: 0,
    rosterEligible: true,
    rosterIneligibleLabel: null,
    rosterStatus: "ACTIVE",
    availability: "UNKNOWN",
    availabilityLabel: "Offen",
    presentationStatus: "OPEN",
    presentationTone: "muted",
    presentationIcon: "circle",
    participationStatus: null,
    participationNote: null,
    responseSource: null,
    responseProvenanceLabel: "Vom Spieler",
    selected: false,
    availabilityConflict: false,
    staleRosterSelection: false,
    canSelect: true,
    canRemove: false,
    ...overrides,
  };
}

describe("MatchSquadPlayerRow", () => {
  it("renders full player name without hiding normal provenance labels", () => {
    render(
      <MatchSquadPlayerRow
        player={player({ responseSource: "PARENT", responseProvenanceLabel: "Von Eltern bestätigt" })}
        action="add"
        onAction={() => {}}
        disabled={false}
        matchId="m1"
        canManageAvailability
        onAvailabilityRecorded={() => {}}
      />,
    );

    expect(screen.getByTestId("match-squad-player-name-p1")).toHaveTextContent(
      "SCE Testspieler 01",
    );
    expect(screen.queryByTestId("match-squad-provenance-p1")).not.toBeInTheDocument();
    expect(screen.queryByText("Von Eltern bestätigt")).not.toBeInTheDocument();
  });

  it("shows trainer proxy indicator when responseSource is TRAINER", () => {
    render(
      <MatchSquadPlayerRow
        player={player({
          responseSource: "TRAINER",
          availabilityLabel: "Unsicher",
          presentationStatus: "MAYBE",
          presentationTone: "warning",
          presentationIcon: "help",
        })}
        action="remove"
        onAction={() => {}}
        disabled={false}
        matchId="m1"
        canManageAvailability
        onAvailabilityRecorded={() => {}}
      />,
    );

    expect(screen.getByTestId("match-squad-provenance-p1")).toHaveTextContent(
      "Vom Trainer eingetragen",
    );
  });

  it("shows conflict badge for selected unavailable players", () => {
    render(
      <MatchSquadPlayerRow
        player={player({
          availability: "UNAVAILABLE",
          availabilityLabel: "Nicht verfügbar",
          presentationStatus: "UNAVAILABLE",
          presentationTone: "danger",
          presentationIcon: "x",
          availabilityConflict: true,
          canSelect: false,
        })}
        action="remove"
        onAction={() => {}}
        disabled={false}
        matchId="m1"
        canManageAvailability={false}
        onAvailabilityRecorded={() => {}}
      />,
    );

    expect(screen.getByTestId("match-squad-conflict-p1")).toHaveTextContent("Aufgebot prüfen");
    expect(screen.getByTestId("match-squad-remove-p1")).toBeInTheDocument();
  });

  it.each([
    {
      label: "OPEN",
      overrides: {
        availabilityLabel: "Offen",
        presentationStatus: "OPEN" as const,
        presentationTone: "muted" as const,
        presentationIcon: "circle" as const,
      },
    },
    {
      label: "YES",
      overrides: {
        availabilityLabel: "Verfügbar",
        presentationStatus: "AVAILABLE" as const,
        presentationTone: "success" as const,
        presentationIcon: "check" as const,
      },
    },
    {
      label: "NO",
      overrides: {
        availabilityLabel: "Nicht verfügbar",
        presentationStatus: "UNAVAILABLE" as const,
        presentationTone: "danger" as const,
        presentationIcon: "x" as const,
        canSelect: false,
      },
    },
    {
      label: "MAYBE",
      overrides: {
        availabilityLabel: "Unsicher",
        presentationStatus: "MAYBE" as const,
        presentationTone: "warning" as const,
        presentationIcon: "help" as const,
      },
    },
  ])("uses shared grid row geometry for $label", ({ overrides }) => {
    const { container, unmount } = render(
      <MatchSquadPlayerRow
        player={player(overrides)}
        action="add"
        onAction={() => {}}
        disabled={false}
        matchId="m1"
        canManageAvailability
        onAvailabilityRecorded={() => {}}
      />,
    );

    const row = container.querySelector(`[data-layout="${MATCH_SQUAD_PLAYER_ROW_LAYOUT}"]`);
    expect(row).toHaveClass(...MATCH_SQUAD_PLAYER_ROW_GRID_CLASS.split(" "));

    const statusColumn = screen.getByTestId("match-squad-availability-p1");
    expect(statusColumn).toHaveAttribute("data-column", "status");
    expect(statusColumn).toHaveClass(...MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS.split(" "));

    unmount();
  });

  it("uses identical row geometry for selected remove vs remaining without Aufbieten", () => {
    const selected = render(
      <MatchSquadPlayerRow
        player={player({
          availabilityLabel: "Verfügbar",
          presentationStatus: "AVAILABLE",
          presentationTone: "success",
          presentationIcon: "check",
        })}
        action="remove"
        onAction={() => {}}
        disabled={false}
        matchId="m1"
        canManageAvailability
        onAvailabilityRecorded={() => {}}
      />,
    );

    const remaining = render(
      <MatchSquadPlayerRow
        player={player({
          availabilityLabel: "Nicht verfügbar",
          presentationStatus: "UNAVAILABLE",
          presentationTone: "danger",
          presentationIcon: "x",
          canSelect: false,
        })}
        action="add"
        onAction={() => {}}
        disabled={false}
        matchId="m1"
        canManageAvailability
        onAvailabilityRecorded={() => {}}
      />,
    );

    const selectedRow = selected.container.querySelector(
      `[data-layout="${MATCH_SQUAD_PLAYER_ROW_LAYOUT}"]`,
    );
    const remainingRow = remaining.container.querySelector(
      `[data-layout="${MATCH_SQUAD_PLAYER_ROW_LAYOUT}"]`,
    );

    expect(selectedRow?.className).toBe(remainingRow?.className);

    const selectedStatus = selected.container.querySelector('[data-column="status"]');
    const remainingStatus = remaining.container.querySelector('[data-column="status"]');
    expect(selectedStatus?.className).toBe(remainingStatus?.className);
  });

  it("omits Aufbieten when player cannot be selected", () => {
    render(
      <MatchSquadPlayerRow
        player={player({
          availability: "UNAVAILABLE",
          availabilityLabel: "Nicht verfügbar",
          presentationStatus: "UNAVAILABLE",
          presentationTone: "danger",
          presentationIcon: "x",
          canSelect: false,
        })}
        action="add"
        onAction={() => {}}
        disabled={false}
        matchId="m1"
        canManageAvailability={false}
        onAvailabilityRecorded={() => {}}
      />,
    );

    expect(screen.queryByTestId("match-squad-add-p1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("match-squad-unavailable-action-p1")).not.toBeInTheDocument();
  });
});
