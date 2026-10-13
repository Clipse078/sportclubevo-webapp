import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type TrainingCreateTabId =
  | "uebersicht"
  | "team"
  | "termin"
  | "wiederholung"
  | "ressourcen";

/** Legacy deep links (01D R1 removed Publikation from the Training composer). */
const OBSOLETE_TRAINING_CREATE_TAB_ALIASES: Partial<Record<string, TrainingCreateTabId>> = {
  publikation: "uebersicht",
};

export function normalizeTrainingCreateTabParam(
  tabParam: string | null | undefined,
): TrainingCreateTabId | null {
  if (typeof tabParam !== "string" || tabParam.length === 0) {
    return null;
  }
  const aliased = OBSOLETE_TRAINING_CREATE_TAB_ALIASES[tabParam];
  if (aliased) {
    return aliased;
  }
  return tabParam as TrainingCreateTabId;
}

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
    ],
  };
}
