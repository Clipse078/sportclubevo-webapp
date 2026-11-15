import type { TargetMetricProgressInput } from "./target-outcome-progress";
import { computeTargetOutcomePercent } from "./target-outcome-progress";

export const CD_STRATEGY_PROGRESS_COPY = {
  outcomeLabel: "Zielerreichung (Erwartetes Ergebnis)",
  deliveryLabel: "Umsetzungsfortschritt (Vorhaben)",
  outcomeUnknownNoMetrics: "Keine Kennzahlen — Zielerreichung nicht berechenbar.",
  outcomeUnknownNotComputable: "Kennzahlen ohne auswertbaren Zielwert.",
  deliveryUnknownNoInitiatives: "Keine verknüpften Vorhaben.",
  deliveryUnknownNoEligibleTasks:
    "Verknüpfte Vorhaben ohne auswertbare Aufgaben — Umsetzungsfortschritt unbekannt.",
  progressOverviewVsFocus:
    "Die Fortschrittsübersicht zeigt alle sichtbaren Ziele. Schwerpunkte oben sind die strategisch verknüpften Ziele.",
  progressOverviewVsFocusWhenEmpty:
    "Die Fortschrittsübersicht listet alle sichtbaren Ziele. Schwerpunkte legen Sie im Abschnitt «Schwerpunkte» fest.",
  focusBadge: "Schwerpunkt",
} as const;

export function describeOutcomeProgressUnknown(
  metrics: TargetMetricProgressInput[],
): string | null {
  if (metrics.length === 0) {
    return CD_STRATEGY_PROGRESS_COPY.outcomeUnknownNoMetrics;
  }
  if (computeTargetOutcomePercent(metrics) !== null) return null;
  return CD_STRATEGY_PROGRESS_COPY.outcomeUnknownNotComputable;
}

export function describeDeliveryProgressUnknown(input: {
  linkedInitiativeCount: number;
  initiativesWithEligibleTasks: number;
}): string | null {
  if (input.linkedInitiativeCount === 0) {
    return CD_STRATEGY_PROGRESS_COPY.deliveryUnknownNoInitiatives;
  }
  if (input.initiativesWithEligibleTasks === 0) {
    return CD_STRATEGY_PROGRESS_COPY.deliveryUnknownNoEligibleTasks;
  }
  return null;
}