import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type MatchCreateTabId =
  | "teams"
  | "termin"
  | "ressourcen"
  | "spielbetrieb"
  | "uebersicht";

export function buildMatchCreateTabNavigationConfig(input?: {
  tabErrors?: Partial<Record<MatchCreateTabId, boolean>>;
}): ContextTabNavigationConfig<MatchCreateTabId> {
  const err = input?.tabErrors ?? {};
  const mark = (id: MatchCreateTabId, label: string) => (err[id] ? `${label} •` : label);

  return {
    contextKind: "MATCH_CREATE",
    defaultTab: "teams",
    tabs: [
      { key: "teams", label: mark("teams", "Teams"), placement: "primary" },
      { key: "termin", label: mark("termin", "Termin"), placement: "primary" },
      { key: "ressourcen", label: mark("ressourcen", "Ressourcen"), placement: "primary" },
      { key: "spielbetrieb", label: mark("spielbetrieb", "Spielbetrieb"), placement: "primary" },
      { key: "uebersicht", label: mark("uebersicht", "Übersicht"), placement: "primary" },
    ],
  };
}
