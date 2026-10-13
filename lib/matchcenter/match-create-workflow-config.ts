import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type MatchCreateTabId =
  | "uebersicht"
  | "teams"
  | "termin"
  | "ressourcen"
  | "spielbetrieb";

export function buildMatchCreateTabNavigationConfig(input?: {
  tabErrors?: Partial<Record<MatchCreateTabId, boolean>>;
}): ContextTabNavigationConfig<MatchCreateTabId> {
  const err = input?.tabErrors ?? {};
  const mark = (id: MatchCreateTabId, label: string) => (err[id] ? `${label} •` : label);

  return {
    contextKind: "MATCH_CREATE",
    defaultTab: "uebersicht",
    tabs: [
      { key: "uebersicht", label: mark("uebersicht", "Übersicht"), placement: "primary" },
      { key: "teams", label: mark("teams", "Teams"), placement: "primary" },
      { key: "termin", label: mark("termin", "Termin"), placement: "primary" },
      { key: "ressourcen", label: mark("ressourcen", "Ressourcen"), placement: "primary" },
      { key: "spielbetrieb", label: mark("spielbetrieb", "Spielbetrieb"), placement: "primary" },
    ],
  };
}
