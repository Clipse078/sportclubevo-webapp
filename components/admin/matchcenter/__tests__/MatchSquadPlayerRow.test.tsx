/**
 * @vitest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MatchSquadPlayerPresentation } from "@/lib/match-squad/types";
import MatchSquadPlayerRow from "../MatchSquadPlayerRow";
import {
  MATCH_SQUAD_PLAYER_ROW_ACTION_COLUMN_CLASS,
  MATCH_SQUAD_PLAYER_ROW_AUFBIETEN_CLASS,
  MATCH_SQUAD_PLAYER_ROW_ENTFERNEN_CLASS,
  MATCH_SQUAD_PLAYER_ROW_GRID_CLASS,
  MATCH_SQUAD_PLAYER_ROW_LAYOUT,
  MATCH_SQUAD_PLAYER_ROW_PLAYER_COLUMN_CLASS,
  MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS,
} from "../match-squad-player-row-layout";

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
    responseSource: "STAFF",
    responseProvenanceLabel: "Vom Staff eingetragen",
    selected: false,
    availabilityConflict: false,
    staleRosterSelection: false,
    canSelect: true,
    canRemove: false,
    ...overrides,
  };
}

function expectRowGeometry(container: HTMLElement) {
  const row = container.querySelector(`[data-layout="${MATCH_SQUAD_PLAYER_ROW_LAYOUT}"]`);
  expect(row).toHaveClass(...MATCH_SQUAD_PLAYER_ROW_GRID_CLASS.split(" "));

  expect(container.querySelector('[data-column="player"]')).toHaveClass(
    ...MATCH_SQUAD_PLAYER_ROW_PLAYER_COLUMN_CLASS.split(" "),
  );
  expect(container.querySelector('[data-column="status"]')).toHaveClass(
    ...MATCH_SQUAD_PLAYER_ROW_STATUS_COLUMN_CLASS.split(" "),
  );
  expect(container.querySelector('[data-column="action"]')).toHaveClass(
    ...MATCH_SQUAD_PLAYER_ROW_ACTION_COLUMN_CLASS.split(" "),
  );
}

describe("MatchSquadPlayerRow", () => {
  it("renders full player name and no availability provenance or response actions", () => {
    render(
      <MatchSquadPlayerRow
        player={player({
          responseSource: "PARENT",
          responseProvenanceLabel: "Von Eltern bestätigt",
        })}
        action="add"
        onAction={() => {}}
        disabled={false}
      />,
    );

    expect(screen.getByTestId("match-squad-player-name-p1")).toHaveTextContent(
      "SCE Testspieler 01",
    );
    expect(screen.queryByTestId("match-squad-provenance-p1")).not.toBeInTheDocument();
    expect(screen.queryByText("Von Eltern bestätigt")).not.toBeInTheDocument();
    expect(screen.queryByText("Vom Staff eingetragen")).not.toBeInTheDocument();
    expect(screen.queryByText("Rückmeldung verwalten")).not.toBeInTheDocument();
    expect(screen.queryByText("Rückmeldung eintragen")).not.toBeInTheDocument();
  });

  it.each([
    {
      caseId: "selected-open",
      action: "remove" as const,
      overrides: {
        availabilityLabel: "Offen",
        presentationStatus: "OPEN" as const,
        presentationTone: "muted" as const,
        presentationIcon: "circle" as const,
        canRemove: true,
      },
    },
    {
      caseId: "selected-yes",
      action: "remove" as const,
      overrides: {
        availabilityLabel: "Verfügbar",
        presentationStatus: "AVAILABLE" as const,
        presentationTone: "success" as const,
        presentationIcon: "check" as const,
        canRemove: true,
      },
    },
    {
      caseId: "selected-maybe",
      action: "remove" as const,
      overrides: {
        availabilityLabel: "Unsicher",
        presentationStatus: "MAYBE" as const,
        presentationTone: "warning" as const,
        presentationIcon: "help" as const,
        canRemove: true,
      },
    },
    {
      caseId: "selected-no",
      action: "remove" as const,
      overrides: {
        availabilityLabel: "Nicht verfügbar",
        presentationStatus: "UNAVAILABLE" as const,
        presentationTone: "danger" as const,
        presentationIcon: "x" as const,
        availabilityConflict: true,
        canRemove: true,
      },
    },
    {
      caseId: "remaining-open",
      action: "add" as const,
      overrides: {
        availabilityLabel: "Offen",
        presentationStatus: "OPEN" as const,
        presentationTone: "muted" as const,
        presentationIcon: "circle" as const,
        canSelect: true,
      },
    },
    {
      caseId: "remaining-yes",
      action: "add" as const,
      overrides: {
        availabilityLabel: "Verfügbar",
        presentationStatus: "AVAILABLE" as const,
        presentationTone: "success" as const,
        presentationIcon: "check" as const,
        canSelect: true,
      },
    },
    {
      caseId: "remaining-maybe",
      action: "add" as const,
      overrides: {
        availabilityLabel: "Unsicher",
        presentationStatus: "MAYBE" as const,
        presentationTone: "warning" as const,
        presentationIcon: "help" as const,
        canSelect: true,
      },
    },
    {
      caseId: "remaining-no",
      action: "add" as const,
      overrides: {
        availabilityLabel: "Nicht verfügbar",
        presentationStatus: "UNAVAILABLE" as const,
        presentationTone: "danger" as const,
        presentationIcon: "x" as const,
        canSelect: false,
      },
    },
  ])("uses identical three-column geometry for $caseId", ({ action, overrides }) => {
    const { container } = render(
      <MatchSquadPlayerRow
        player={player(overrides)}
        action={action}
        onAction={() => {}}
        disabled={false}
      />,
    );

    expectRowGeometry(container);
    expect(container.querySelector('[data-column="action"]')).toBeInTheDocument();
  });

  it("styles Aufbieten as positive and Entfernen as destructive", () => {
    const add = render(
      <MatchSquadPlayerRow
        player={player({ canSelect: true })}
        action="add"
        onAction={() => {}}
        disabled={false}
      />,
    );
    expect(add.getByTestId("match-squad-add-p1")).toHaveClass(
      ...MATCH_SQUAD_PLAYER_ROW_AUFBIETEN_CLASS.split(" "),
    );
    add.unmount();

    render(
      <MatchSquadPlayerRow
        player={player({ canRemove: true })}
        action="remove"
        onAction={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByTestId("match-squad-remove-p1")).toHaveClass(
      ...MATCH_SQUAD_PLAYER_ROW_ENTFERNEN_CLASS.split(" "),
    );
  });

  it("keeps empty action cell for unavailable remaining players", () => {
    const { container } = render(
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
      />,
    );

    const actionCell = container.querySelector('[data-column="action"]');
    expect(actionCell).toBeInTheDocument();
    expect(within(actionCell as HTMLElement).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows conflict badge and Entfernen for selected unavailable", () => {
    render(
      <MatchSquadPlayerRow
        player={player({
          availabilityLabel: "Nicht verfügbar",
          presentationStatus: "UNAVAILABLE",
          presentationTone: "danger",
          presentationIcon: "x",
          availabilityConflict: true,
          canRemove: true,
        })}
        action="remove"
        onAction={() => {}}
        disabled={false}
      />,
    );

    expect(screen.getByTestId("match-squad-conflict-p1")).toHaveTextContent("Aufgebot prüfen");
    expect(screen.getByTestId("match-squad-remove-p1")).toBeInTheDocument();
  });
});
