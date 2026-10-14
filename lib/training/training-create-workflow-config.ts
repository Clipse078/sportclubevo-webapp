import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";

export type TrainingCreateTabId =
  | "team"
  | "termin"
  | "wiederholung"
  | "ressourcen"
  | "pruefen";

/** Legacy deep links — editable fields moved off the old first «Übersicht» tab. */
const OBSOLETE_TRAINING_CREATE_TAB_ALIASES: Partial<Record<string, TrainingCreateTabId>> = {
  uebersicht: "team",
  publikation: "pruefen",
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
    defaultTab: "team",
    resolveTabParam: (raw) => normalizeTrainingCreateTabParam(raw),
    tabs: [
      { key: "team", label: mark("team", "Team"), placement: "primary" },
      { key: "termin", label: mark("termin", "Termin"), placement: "primary" },
      { key: "wiederholung", label: mark("wiederholung", "Wiederholung"), placement: "primary" },
      { key: "ressourcen", label: mark("ressourcen", "Ressourcen"), placement: "primary" },
      { key: "pruefen", label: mark("pruefen", "Übersicht"), placement: "primary" },
    ],
  };
}
