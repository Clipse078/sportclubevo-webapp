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

const HOME_TAB_ORDER_WITH_SPIELPLAN: TournamentCreateTabId[] = [
  "termin",
  "teams",
  "turnierformat",
  "spielfelder",
  "spielplan",
  "ressourcen",
  "publikation",
  "uebersicht",
];

const HOME_TAB_ORDER_WITHOUT_SPIELPLAN: TournamentCreateTabId[] = [
  "termin",
  "teams",
  "ressourcen",
  "publikation",
  "uebersicht",
];

const AWAY_TAB_ORDER: TournamentCreateTabId[] = [
  "termin",
  "teams",
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

export function resolveTournamentCreateTabOrder(
  homeAway: "HOME" | "AWAY",
  options?: { spielplanCreationEnabled?: boolean },
): TournamentCreateTabId[] {
  if (homeAway === "AWAY") return AWAY_TAB_ORDER;
  return options?.spielplanCreationEnabled === true
    ? HOME_TAB_ORDER_WITH_SPIELPLAN
    : HOME_TAB_ORDER_WITHOUT_SPIELPLAN;
}

export function buildTournamentCreateTabNavigationConfig(input?: {
  homeAway?: "HOME" | "AWAY";
  spielplanCreationEnabled?: boolean;
  tabErrors?: Partial<Record<TournamentCreateTabId, boolean>>;
}): ContextTabNavigationConfig<TournamentCreateTabId> {
  const homeAway = input?.homeAway ?? "HOME";
  const err = input?.tabErrors ?? {};
  const mark = (id: TournamentCreateTabId, label: string) => (err[id] ? `${label} •` : label);
  const order = resolveTournamentCreateTabOrder(homeAway, {
    spielplanCreationEnabled: input?.spielplanCreationEnabled,
  });

  return {
    contextKind: "TOURNAMENT_CREATE",
    defaultTab: "termin",
    tabs: order.map((key) => ({
      key,
      label: mark(key, TAB_LABELS[key]),
      placement: "primary" as const,
    })),
  };
}
