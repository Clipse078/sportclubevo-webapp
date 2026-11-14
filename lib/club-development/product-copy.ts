/**
 * SCE-CD-04R3 — Vereinsentwicklung user-facing German product copy.
 * Presentation labels only; routes, enums and API keys stay unchanged.
 */

export const CD_NAV_COPY = {
  initiativeBacklog: "Vorhaben & Prioritäten",
  implementationPlanning: "Umsetzungsplanung",
  initiativesEyebrow: "Vorhaben",
} as const;

export const CD_SPRINT_WORKSPACE_COPY = {
  workspaceAria: "Umsetzungsphase-Arbeitsbereich",
  tabPlanning: "Planung",
  tabTaskBoard: "Aufgabenboard",
  tabReview: "Rückblick",
  createPhase: "Umsetzungsphase erstellen",
  startPhase: "Umsetzungsphase starten",
  closePhase: "Umsetzungsphase abschließen",
  tasksInPhase: "Aufgaben in dieser Umsetzungsphase",
  removeFromPhase: "Aus Umsetzungsphase entfernen",
  taskBoardTitle: "Aufgabenboard",
  goalPlaceholder: "Ziel beschreiben …",
  noGoalRecorded: "Kein Ziel erfasst.",
  addedAfterStart: "Nach Start hinzugefügt",
  committedAtStart: "Zum Start eingeplant",
  scopeAtStart: "Aufgabenumfang zum Start",
  scopeChanges: "Änderungen am Aufgabenumfang",
  futurePhase: "Künftige Umsetzungsphase",
  expectedResult: "Erwartetes Ergebnis",
  metrics: "Kennzahlen",
} as const;

export const CD_TASK_WORKSPACE_COPY = {
  primaryInitiative: "Primäres Vorhaben",
  currentImplementationPhase: "Aktuelle Umsetzungsphase",
  priorImplementationPhases: "Frühere Umsetzungsphasen",
  returnToImplementationPhase: "Zurück zur Umsetzungsphase",
} as const;

export function isSprintWorkspaceReturnPath(returnTo: string | null): boolean {
  return Boolean(returnTo?.includes("/vereinsleitung/sprints/"));
}