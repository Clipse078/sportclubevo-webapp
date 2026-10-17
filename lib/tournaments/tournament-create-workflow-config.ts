import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type TournamentCreateTabId =
  | "teams"
  | "turnierformat"
  | "termin"
  | "spielfelder"
  | "spielplan"
  | "ressourcen"
  | "publikation"
  | "uebersicht";

const HOME_TAB_ORDER: TournamentCreateTabId[] = [
  "teams",
  "turnierformat",
  "termin",
  "spielfelder",
  "spielplan",
  "ressourcen",
  "publikation",
  "uebersicht",
];

const AWAY_TAB_ORDER: TournamentCreateTabId[] = [
  "teams",
  "termin",
  "ressourcen",
  "publikation",
  "uebersicht",
];

const TAB_LABELS: Record<TournamentCreateTabId, string> = {
  teams: "Teams",
  turnierformat: "Turnierformat",
  termin: "Termin",
  spielfelder: "Spielfelder",
  spielplan: "Spielplan",
  ressourcen: "Ressourcen",
  publikation: "Publikation",
  uebersicht: "Übersicht",
};

export function resolveTournamentCreateTabOrder(homeAway: "HOME" | "AWAY"): TournamentCreateTabId[] {
  return homeAway === "HOME" ? HOME_TAB_ORDER : AWAY_TAB_ORDER;
}

export function buildTournamentCreateTabNavigationConfig(input?: {
  homeAway?: "HOME" | "AWAY";
  tabErrors?: Partial<Record<TournamentCreateTabId, boolean>>;
}): ContextTabNavigationConfig<TournamentCreateTabId> {
  const homeAway = input?.homeAway ?? "HOME";
  const err = input?.tabErrors ?? {};
  const mark = (id: TournamentCreateTabId, label: string) => (err[id] ? `${label} •` : label);
  const order = resolveTournamentCreateTabOrder(homeAway);

  return {
    contextKind: "TOURNAMENT_CREATE",
    defaultTab: "teams",
    tabs: order.map((key) => ({
      key,
      label: mark(key, TAB_LABELS[key]),
      placement: "primary" as const,
    })),
  };
}
