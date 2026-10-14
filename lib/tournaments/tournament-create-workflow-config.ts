import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type TournamentCreateTabId =
  | "teams"
  | "termin"
  | "ressourcen"
  | "publikation"
  | "uebersicht";

export function buildTournamentCreateTabNavigationConfig(input?: {
  tabErrors?: Partial<Record<TournamentCreateTabId, boolean>>;
}): ContextTabNavigationConfig<TournamentCreateTabId> {
  const err = input?.tabErrors ?? {};
  const mark = (id: TournamentCreateTabId, label: string) => (err[id] ? `${label} •` : label);

  return {
    contextKind: "TOURNAMENT_CREATE",
    defaultTab: "teams",
    tabs: [
      { key: "teams", label: mark("teams", "Teams"), placement: "primary" },
      { key: "termin", label: mark("termin", "Termin"), placement: "primary" },
      { key: "ressourcen", label: mark("ressourcen", "Ressourcen"), placement: "primary" },
      { key: "publikation", label: mark("publikation", "Publikation"), placement: "primary" },
      { key: "uebersicht", label: mark("uebersicht", "Übersicht"), placement: "primary" },
    ],
  };
}
