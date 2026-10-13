import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type TrainingCreateTabId =
  | "uebersicht"
  | "team"
  | "termin"
  | "wiederholung"
  | "ressourcen"
  | "publikation";

export function buildTrainingCreateTabNavigationConfig(input?: {
  tabErrors?: Partial<Record<TrainingCreateTabId, boolean>>;
}): ContextTabNavigationConfig<TrainingCreateTabId> {
  const err = input?.tabErrors ?? {};
  const mark = (id: TrainingCreateTabId, label: string) => (err[id] ? `${label} •` : label);

  return {
    contextKind: "TRAINING_CREATE",
    defaultTab: "uebersicht",
    tabs: [
      { key: "uebersicht", label: mark("uebersicht", "Übersicht"), placement: "primary" },
      { key: "team", label: mark("team", "Team"), placement: "primary" },
      { key: "termin", label: mark("termin", "Termin"), placement: "primary" },
      { key: "wiederholung", label: mark("wiederholung", "Wiederholung"), placement: "primary" },
      { key: "ressourcen", label: mark("ressourcen", "Ressourcen"), placement: "primary" },
      { key: "publikation", label: mark("publikation", "Publikation"), placement: "primary" },
    ],
  };
}
