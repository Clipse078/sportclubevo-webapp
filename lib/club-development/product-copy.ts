/**
 * SCE-CD-04R3 — Vereinsentwicklung user-facing German product copy.
 * Presentation labels only; routes, enums and API keys stay unchanged.
 */

export const CD_NAV_COPY = {
  initiativeBacklog: "Vorhaben & Prioritäten",
  implementationPlanning: "Umsetzungsplanung",
  initiativesEyebrow: "Vorhaben",
  strategyOverview: "Strategie",
  initiativesAndTasksHub: "Vorhaben & Aufgaben",
} as const;

/** PKG-01 — navigation hub copy (routes unchanged). */
export const CD_OVERVIEW_SHORTCUT_COPY = {
  strategyDescription:
    "Fortschrittsübersicht zu Zielen, Kennzahlen und verknüpften Vorhaben — kein Ersatz für Zieldetails.",
  backlogDescription: "Priorisierte Vorhaben mit Einordnung und Erwartetem Ergebnis.",
  sprintDescription: "Umsetzungsphasen planen, Aufgaben zuordnen und abschließen.",
  workHubDescription:
    "Weiterleitung zu Vorhaben, Prioritäten, Aufgaben und Umsetzungsplanung — kein gemeinsamer Arbeitsbereich (PKG-02).",
} as const;

export const CD_VORHABEN_HUB_COPY = {
  hubIntro:
    "Vorhaben & Aufgaben ist ein Wegweiser. Liste, Backlog, Aufgaben und Umsetzungsphasen bleiben in den jeweiligen Modulen.",
  initiativeListTitle: "Vorhaben-Liste",
  initiativeListDescription: "Alle sichtbaren Vorhaben mit Status, Fortschritt und Verantwortlichen.",
  taskInboxTitle: "Aufgaben",
  taskInboxDescription: "Zentrale Aufgabenübersicht und Zuweisungen im Aufgaben-Bereich.",
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

/** Canonical German labels for development sprint (Umsetzungsphase) lifecycle — presentation only. */
export const CD_SPRINT_STATUS_LABELS = {
  PLANNED: "Geplant",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
} as const;

export const CD_SPRINT_WORKSPACE_COPY = {
  workspaceAria: "Umsetzungsphase-Arbeitsbereich",
  tabPlanning: "Planung",
  tabTaskBoard: "Aufgabenboard",
  tabReview: "Rückblick",
  createPhase: "Umsetzungsphase erstellen",
  startPhase: "Phase starten",
  closePhase: "Umsetzungsphase abschließen",
  tasksInPhase: "Aufgaben",
  removeFromPhase: "Aus Phase entfernen",
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
  assignedImplementationPhase: "Zugeordnete Umsetzungsphase",
  priorImplementationPhases: "Frühere Umsetzungsphasen",
  returnToImplementationPhase: "Zurück zur Umsetzungsphase",
  dueAt: "Fällig am",
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