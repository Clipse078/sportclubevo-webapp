/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MatchSquadPlayerPresentation } from "@/lib/match-squad/types";
import MatchSquadPlayerRow from "../MatchSquadPlayerRow";

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
