/** Client-safe copy for strategy/target progress surfaces (no server-only imports). */

export const CD_STRATEGY_PROGRESS_COPY = {
  goalAchievementLabel: "Zielerreichung",
  outcomeLabel: "Zielerreichung (Erwartetes Ergebnis)",
  deliveryLabel: "Umsetzungsfortschritt",
  taskProgressLabel: "Aufgabenfortschritt",
  goalAchievementEmpty: "Noch keine Ziele",
  outcomeUnknownNoMetrics: "Keine Kennzahlen — Zielerreichung nicht berechenbar.",
  outcomeUnknownNotComputable: "Kennzahlen ohne auswertbaren Zielwert.",
  deliveryUnknownNoInitiatives: "Noch keine Aufgaben.",
  deliveryUnknownNoEligibleTasks: "Noch keine auswertbaren Aufgaben.",
  progressOverviewVsFocus:
    "Die Fortschrittsübersicht zeigt alle sichtbaren Ziele. Schwerpunkte oben sind die strategisch verknüpften Ziele.",
  progressOverviewVsFocusWhenEmpty:
    "Die Fortschrittsübersicht listet alle sichtbaren Ziele. Schwerpunkte legen Sie im Abschnitt «Schwerpunkte» fest.",
  focusBadge: "Schwerpunkt",
} as const;