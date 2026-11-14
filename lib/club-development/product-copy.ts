/**
 * SCE-CD-04R3 — Vereinsentwicklung user-facing German product copy.
 * Presentation labels only; routes, enums and API keys stay unchanged.
 */

export const CD_NAV_COPY = {
  initiativeBacklog: "Vorhaben & Prioritäten",
  implementationPlanning: "Umsetzungsplanung",
  initiativesEyebrow: "Vorhaben",
} as const;

export const CD_INITIATIVE_COPY = {
  singular: "Vorhaben",
  plural: "Vorhaben",
  dispositionFilter: "Einordnung",
  createInBacklog: "Vorhaben im Backlog erfassen",
  createNew: "Neues Vorhaben",
  createAction: "Vorhaben erstellen",
  saveChanges: "Änderungen speichern",
  notFound: "Vorhaben nicht gefunden",
  notFoundHeading: "Dieses Vorhaben ist noch nicht erfasst",
  deleteTitle: "Vorhaben endgültig löschen",
  deleteFailed: "Vorhaben konnte nicht gelöscht werden.",
  emptyBacklogManage: "Keine Vorhaben im Backlog. Erfassen Sie das erste Vorhaben oben.",
  emptyBacklogView: "Keine sichtbaren Vorhaben im Backlog.",
  composerTitle: "Neues Vorhaben",
  composerDescription: "Vorhaben im Workspace erfassen — ohne die Übersicht zu verlassen.",
  withoutInitiative: "Ohne Vorhaben",
  reviewBanner: "Prüfung & Freigabe",
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
  futurePhase: "künftige Umsetzungsphase",
  futurePhaseTitle: "Künftige Umsetzungsphase",
  expectedResult: "Erwartetes Ergebnis",
  metrics: "Kennzahlen",
  boardQuickLink: "Zum Aufgabenboard",
  closeTargetPhasePerTask: "Ziel-Umsetzungsphase je Aufgabe",
  chooseTargetPhase: "— Umsetzungsphase wählen —",
  addTaskToPhase: "Anlegen und zur Umsetzungsphase hinzufügen",
  taskAssignedToPhase: "Aufgabe wurde der Umsetzungsphase zugeordnet.",
  phaseAssignmentFailed: "Aufgabe erstellt, Zuordnung zur Umsetzungsphase fehlgeschlagen.",
} as const;

/** API / service error and status messages for development sprints (Umsetzungsphase). */
export const CD_SPRINT_API_COPY = {
  phaseNotFound: "Umsetzungsphase nicht gefunden.",
  phaseAlreadyCompleted: "Umsetzungsphase ist bereits abgeschlossen.",
  onlyActivePhaseCanClose: "Nur aktive Umsetzungsphasen können abgeschlossen werden.",
  phaseGoalResultRequired: "Zielergebnis der Umsetzungsphase ist erforderlich.",
  completedPhasesCannotBePlanned: "Abgeschlossene Umsetzungsphasen können nicht mehr geplant werden.",
  closeViaWorkflow: "Umsetzungsphasen werden über den Abschluss-Workflow beendet.",
  taskAlreadyInPhase: "Aufgabe ist bereits in dieser Umsetzungsphase.",
  taskNotInPhase: "Aufgabe ist nicht in dieser Umsetzungsphase.",
  taskAlreadyInOtherPhase: (phaseTitle: string) =>
    `Aufgabe ist bereits in der Umsetzungsphase „${phaseTitle}" — Aufgaben werden nicht automatisch verschoben.`,
  taskAlreadyInOtherPhaseShort: "Aufgabe ist bereits einer anderen Umsetzungsphase zugeordnet.",
  alreadyInPhase: "Bereits in dieser Umsetzungsphase",
  alreadyInPhaseNamed: (phaseTitle: string) =>
    `Bereits in der Umsetzungsphase „${phaseTitle}" — Aufgaben werden nicht automatisch verschoben.`,
  targetPhaseNotFound: "Ziel-Umsetzungsphase nicht gefunden.",
  cannotMoveToSamePhase: "Aufgabe kann nicht in dieselbe Umsetzungsphase verschoben werden.",
  completedPhaseNotAllowedAsTarget: "Abgeschlossene Umsetzungsphasen sind als Ziel nicht erlaubt.",
  targetPhaseRequiredForTask: (taskTitle: string) =>
    `Für Aufgabe „${taskTitle}" ist eine Ziel-Umsetzungsphase für die Verschiebung erforderlich.`,
  phaseAssignmentFailed: "Zuordnung zur Umsetzungsphase fehlgeschlagen.",
} as const;

export const CD_TASK_WORKSPACE_COPY = {
  primaryInitiative: "Primäres Vorhaben",
  currentImplementationPhase: "Aktuelle Umsetzungsphase",
  priorImplementationPhases: "Frühere Umsetzungsphasen",
  returnToImplementationPhase: "Zurück zur Umsetzungsphase",
} as const;

export const CD_TARGET_COPY = {
  metricsSection: "Kennzahlen",
  noMetricsYet: "Noch keine Kennzahlen erfasst.",
  createWithMetrics: "Strategisches Ziel mit messbaren Kennzahlen erfassen.",
  createWithMetricsComposer: "Strategisches Ziel mit Kennzahlen — Vorlagen optional im Composer.",
  progressDetail: "Fortschritt, Kennzahlen und Messwerte im Detail.",
  linkedInitiativesProgress: "Ziele mit Outcome-Fortschritt, Umsetzungsfortschritt über verknüpfte Vorhaben und Kennzahlen.",
  backlogDescriptionEinordnung: "Priorisierte Vorhaben mit Einordnung",
} as const;

export function isSprintWorkspaceReturnPath(returnTo: string | null): boolean {
  return Boolean(returnTo?.includes("/vereinsleitung/sprints/"));
}

export function formatLinkedInitiativeCount(count: number): string {
  return count === 1 ? "1 verknüpftes Vorhaben" : `${count} verknüpfte Vorhaben`;
}