import {
  listAllVisibleTabs,
  listVisibleOverflowTabs,
  listVisiblePrimaryTabs,
} from "@/lib/context-tabs/registry";
import type { ActivityNavigationKind, ActivityTabNavigationConfig } from "./types";

export type ActivityTabVisibilityInput = {
  kind: ActivityNavigationKind;
  /** Match: integrated Aufgebot workspace available. */
  matchSquadAvailable?: boolean;
  /** Tournament: Hauptteam squad workspace available (not Teilnahme). */
  tournamentSquadAvailable?: boolean;
  /** Match / tournament: participation surfaces available (not cancelled). */
  participationAvailable?: boolean;
  /** Collaboration host mounted and user can open section. */
  communicationAvailable?: boolean;
  /** Planung / work surfaces (tasks, resources planning). */
  planningAvailable?: boolean;
  /** Spielbetrieb operational editor (match). */
  spielbetriebAvailable?: boolean;
  /** Overflow destinations (publication, technical metadata, …). */
  mehrAvailable?: boolean;
};

/**
 * Builds the tab matrix for an activity detail workspace after diagnosis.
 * Callers pass capability flags; tabs with no meaningful destination stay hidden.
 */
export function buildActivityTabNavigationConfig(
  input: ActivityTabVisibilityInput,
): ActivityTabNavigationConfig {
  const participationAvailable = input.participationAvailable !== false;
  const communicationAvailable = input.communicationAvailable !== false;
  const planningAvailable = input.planningAvailable !== false;
  const mehrAvailable = input.mehrAvailable !== false;

  switch (input.kind) {
    case "TRAINING":
      return {
        contextKind: "TRAINING",
        kind: "TRAINING",
        defaultTab: "uebersicht",
        tabs: [
          { key: "uebersicht", label: "Übersicht", placement: "primary", visible: true },
          {
            key: "teilnahme",
            label: "Teilnahme",
            placement: "primary",
            visible: participationAvailable,
          },
          {
            key: "planung",
            label: "Planung",
            placement: "primary",
            visible: planningAvailable,
          },
          {
            key: "kommunikation",
            label: "Kommunikation",
            placement: "primary",
            visible: communicationAvailable,
          },
          { key: "mehr", label: "Mehr", placement: "overflow", visible: mehrAvailable },
        ],
      };

    case "MATCH": {
      const aufgebotAvailable = input.matchSquadAvailable === true;
      const spielbetriebAvailable = input.spielbetriebAvailable !== false;
      return {
        contextKind: "MATCH",
        kind: "MATCH",
        defaultTab: "uebersicht",
        tabs: [
          { key: "uebersicht", label: "Übersicht", placement: "primary", visible: true },
          {
            key: "aufgebot",
            label: "Aufgebot",
            placement: "primary",
            visible: aufgebotAvailable,
          },
          {
            key: "teilnahme",
            label: "Teilnahme",
            placement: "primary",
            visible: participationAvailable,
          },
          {
            key: "spielbetrieb",
            label: "Spielbetrieb",
            placement: "primary",
            visible: spielbetriebAvailable,
          },
          {
            key: "kommunikation",
            label: "Kommunikation",
            placement: "primary",
            visible: communicationAvailable,
          },
          { key: "mehr", label: "Mehr", placement: "overflow", visible: mehrAvailable },
        ],
      };
    }

    case "TOURNAMENT": {
      const aufgebotAvailable = input.tournamentSquadAvailable === true;
      return {
        contextKind: "TOURNAMENT",
        kind: "TOURNAMENT",
        defaultTab: "uebersicht",
        tabs: [
          { key: "uebersicht", label: "Übersicht", placement: "primary", visible: true },
          {
            key: "aufgebot",
            label: "Aufgebot",
            placement: "primary",
            visible: aufgebotAvailable,
          },
          {
            key: "teilnahme",
            label: "Teilnahme",
            placement: "primary",
            visible: participationAvailable,
          },
          {
            key: "planung",
            label: "Planung",
            placement: "primary",
            visible: planningAvailable,
          },
          {
            key: "kommunikation",
            label: "Kommunikation",
            placement: "primary",
            visible: communicationAvailable,
          },
          { key: "mehr", label: "Mehr", placement: "overflow", visible: mehrAvailable },
        ],
      };
    }

    case "CLUB_EVENT":
      return {
        contextKind: "CLUB_EVENT",
        kind: "CLUB_EVENT",
        defaultTab: "uebersicht",
        tabs: [
          { key: "uebersicht", label: "Übersicht", placement: "primary", visible: true },
          {
            key: "teilnahme",
            label: "Teilnahme",
            placement: "primary",
            visible: participationAvailable,
          },
          {
            key: "planung",
            label: "Planung",
            placement: "primary",
            visible: planningAvailable,
          },
          {
            key: "kommunikation",
            label: "Kommunikation",
            placement: "primary",
            visible: communicationAvailable,
          },
          { key: "mehr", label: "Mehr", placement: "overflow", visible: mehrAvailable },
        ],
      };

    default: {
      const _exhaustive: never = input.kind;
      return _exhaustive;
    }
  }
}

export { listVisiblePrimaryTabs, listVisibleOverflowTabs, listAllVisibleTabs };
