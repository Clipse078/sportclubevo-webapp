/**
 * Non-activity proof fixture — TEAM context could adopt the same contract in a future package.
 * Not mounted in production UI; validates generic registry + URL resolution in tests.
 */
import type { ContextTabNavigationConfig } from "../types";
import { listAllVisibleTabs } from "../registry";

export type ExampleTeamTabId =
  | "uebersicht"
  | "kader"
  | "programm"
  | "trainer"
  | "kommunikation"
  | "mehr";

export type ExampleTeamTabVisibility = {
  rosterAvailable?: boolean;
  programmeAvailable?: boolean;
  trainersAvailable?: boolean;
  communicationAvailable?: boolean;
  mehrAvailable?: boolean;
};

export function buildExampleTeamContextTabConfig(
  input: ExampleTeamTabVisibility = {},
): ContextTabNavigationConfig<ExampleTeamTabId> {
  const rosterAvailable = input.rosterAvailable !== false;
  const programmeAvailable = input.programmeAvailable !== false;
  const trainersAvailable = input.trainersAvailable !== false;
  const communicationAvailable = input.communicationAvailable !== false;
  const mehrAvailable = input.mehrAvailable !== false;

  return {
    contextKind: "TEAM_EXAMPLE",
    defaultTab: "uebersicht",
    tabs: [
      { key: "uebersicht", label: "Übersicht", placement: "primary", visible: true },
      { key: "kader", label: "Kader", placement: "primary", visible: rosterAvailable },
      { key: "programm", label: "Programm", placement: "primary", visible: programmeAvailable },
      { key: "trainer", label: "Trainer", placement: "primary", visible: trainersAvailable },
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

export function listExampleTeamVisibleTabKeys(input: ExampleTeamTabVisibility = {}) {
  return listAllVisibleTabs(buildExampleTeamContextTabConfig(input)).map((t) => t.key);
}
