import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type ClubEventCreateTabId =
  | "uebersicht"
  | "gueltigkeit"
  | "termin"
  | "ressourcen"
  | "publikation";

export function buildClubEventCreateTabNavigationConfig(input?: {
  tabErrors?: Partial<Record<ClubEventCreateTabId, boolean>>;
}): ContextTabNavigationConfig<ClubEventCreateTabId> {
  const err = input?.tabErrors ?? {};
  const mark = (id: ClubEventCreateTabId, label: string) =>
    err[id] ? `${label} •` : label;

  return {
    contextKind: "CLUB_EVENT_CREATE",
    defaultTab: "uebersicht",
    tabs: [
      { key: "uebersicht", label: mark("uebersicht", "Übersicht"), placement: "primary" },
      { key: "gueltigkeit", label: mark("gueltigkeit", "Gültigkeit"), placement: "primary" },
      { key: "termin", label: mark("termin", "Termin"), placement: "primary" },
      { key: "ressourcen", label: mark("ressourcen", "Ressourcen"), placement: "primary" },
      { key: "publikation", label: mark("publikation", "Publikation"), placement: "primary" },
    ],
  };
}
