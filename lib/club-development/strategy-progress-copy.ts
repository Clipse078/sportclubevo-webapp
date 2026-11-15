/** Client-safe copy for strategy/target progress surfaces (no server-only imports). */

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