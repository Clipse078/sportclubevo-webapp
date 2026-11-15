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

/** PKG-05 — club strategy authoring (Strategie route). */
export const CD_STRATEGY_AUTHORING_COPY = {
  pageTitle: "Strategie",
  pageDescription: "Gemeinsame Ausrichtung, Ziele und Fortschritt.",
  workspacePageDescription: "Gemeinsame Ausrichtung, Ziele und Fortschritt.",
  sectionTitle: "Clubstrategie",
  editAction: "Bearbeiten",
  cancelEditAction: "Ansicht",
  unsavedNotice: "Ungespeicherte Änderungen",
  saveSuccess: "Strategie gespeichert.",
  situationLabel: "Ausgangslage",
  situationPlaceholder: "Was ist für die aktuelle Vereinslage wesentlich?",
  alignmentLabel: "Gemeinsame Ausrichtung",
  alignmentPlaceholder: "Wohin soll sich der Verein entwickeln?",
  responsibleLabel: "Verantwortung",
  unassignedResponsible: "Nicht zugewiesen",
  periodLabel: "Strategieperiode",
  periodPlaceholder: "z. B. Saison 2026/27",
  periodStartLabel: "Von",
  periodEndLabel: "Bis",
  nextReviewLabel: "Nächste Überprüfung",
  metaHeading: "Rahmen",
  saveAction: "Strategie speichern",
  focusHeading: "Schwerpunkte",
  focusHint: "Verknüpfte Ziele — Details und Kennzahlen im Ziel.",
  focusEmpty: "Noch keine Schwerpunkte verknüpft.",
  supportingHeading: "Sitzungen, Beschlüsse & Unterlagen",
  supportingCollapsedSummary: (meetings: number, decisions: number, documents: number) => {
    const parts: string[] = [];
    if (meetings > 0) parts.push(`${meetings} Sitzung${meetings === 1 ? "" : "en"}`);
    if (decisions > 0) parts.push(`${decisions} Beschluss${decisions === 1 ? "" : "e"}`);
    if (documents > 0) parts.push(`${documents} Unterlage${documents === 1 ? "" : "n"}`);
    if (parts.length === 0) return "Keine Verknüpfungen";
    return parts.join(" · ");
  },
  meetingLinksHeading: "Sitzungen & Beschlüsse",
  associationSaveAction: "Verknüpfungen speichern",
  associationSaveSuccess: "Verknüpfungen gespeichert.",
  associationEmpty: "Noch keine Verknüpfungen.",
  documentsHeading: "Unterlagen",
  documentsEmpty: "Noch keine Unterlagen verknüpft.",
  docKindLeitbild: "Leitbild",
  docKindStrategy: "Vereinbarte Strategieunterlagen",
  docKindSupporting: "Weitere Unterlagen",
  progressHeading: "Fortschritt zu Zielen",
  progressHint: "Zielerreichung (Kennzahlen) und Umsetzungsfortschritt (Vorhaben) sind getrennt.",
  progressScopeNote:
    "Die Fortschrittsübersicht zeigt alle sichtbaren Ziele — Schwerpunkte oben sind die strategisch verknüpften Ziele.",
} as const;

/** PKG-01 — navigation hub copy (routes unchanged). */
export const CD_OVERVIEW_SHORTCUT_COPY = {
  strategyDescription:
    "Fortschrittsübersicht zu Zielen, Kennzahlen und verknüpften Vorhaben — kein Ersatz für Zieldetails.",
  backlogDescription: "Priorisierte Vorhaben mit Einordnung und Erwartetem Ergebnis.",
  sprintDescription: "Umsetzungsphasen planen, Aufgaben zuordnen und abschließen.",
  workHubDescription:
    "Gemeinsamer Arbeitsbereich für sichtbare Vorhaben und zugehörige Aufgaben — gefilterte Lens, kein Ersatz für die Aufgaben-Inbox.",
} as const;

/** PKG-02 — CD-WORK Vorhaben & Aufgaben workspace copy. */
export const CD_VORHABEN_WORKSPACE_COPY = {
  intro:
    "Vorhaben & Aufgaben bündelt sichtbare Vorhaben mit zugehörigen Aufgaben in einer gefilterten Arbeitsansicht. Vorhaben-Details, Ziele, Umsetzungsplanung und die zentrale Aufgaben-Inbox bleiben erreichbar.",
  shortcutStrategy: "Ziele, Kennzahlen und Fortschritt — Sprung zu Zieldetails oder gefiltertem Backlog.",
  shortcutBacklog: "Prioritäten und Einordnung — nicht derselbe Einstieg wie dieser Arbeitsbereich.",
  shortcutSprints: "Root-Aufgaben planen; Unteraufgaben bleiben am übergeordneten Aufgaben-Arbeitsplatz.",
  shortcutTasksInbox: "Alle Aufgaben mandantenweit — dieser Bereich filtert auf Vereinsentwicklung.",
  targetFilterHint: "Anzeige auf Vorhaben mit Verknüpfung zum gewählten strategischen Ziel.",
  searchPlaceholder: "Vorhaben oder Aufgaben suchen …",
  allInitiatives: "Alle sichtbaren Vorhaben",
  anyOpenTaskStatus: "Aktive Aufgaben (ohne Abbruch)",
  focusInitiative: "Fokus:",
  initiativesHeading: "Vorhaben",
  tasksHeading: "Zugehörige Aufgaben",
  rootTasksOnly: "Nur übergeordnete Aufgaben — Unteraufgaben im Aufgaben-Arbeitsplatz.",
  emptyInitiatives: "Keine Vorhaben für die aktuelle Filterung sichtbar.",
  emptyTasks: "Keine passenden Aufgaben — prüfen Sie Filter oder Verknüpfungen im Vorhaben-Detail.",
  rootTasksTruncationNotice: (shown: number, total: number) =>
    `Es werden ${shown} von ${total} Wurzel-Aufgaben angezeigt.`,
  allRootTasksAction: "Alle Wurzel-Aufgaben in Vorhaben & Aufgaben",
  noInitiativeAccess: "Keine Berechtigung zur Vorhaben-Ansicht.",
  noTaskAccess: "Keine Berechtigung zur Aufgaben-Ansicht.",
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
  addMetricAction: "Kennzahl hinzufügen",
  governanceSection: "Prüfung & Freigabe",
  reviewStatusLabel: "Prüfstatus",
  targetStatusLabel: "Zielstatus",
  linksInitiatives: "Vorhaben",
  linksMeetings: "Sitzungen",
  noLinkedInitiatives: "Keine Vorhaben verknüpft.",
  noLinkedMeetings: "Keine Sitzungen verknüpft.",
  createWithMetrics: "Strategisches Ziel mit messbaren Kennzahlen erfassen.",
  createWithMetricsComposer: "Strategisches Ziel mit Kennzahlen — Vorlagen optional im Composer.",
  progressDetail: "Fortschritt, Kennzahlen und Messwerte im Detail.",
  linkedInitiativesProgress: "Ziele mit Outcome-Fortschritt, Umsetzungsfortschritt über verknüpfte Vorhaben und Kennzahlen.",
  backlogDescriptionEinordnung: "Priorisierte Vorhaben mit Einordnung",
  vorhabenSectionHeading: "Vorhaben",
  vorhabenSectionHint: "Umsetzung zu diesem Ziel — verknüpfte Vorhaben erscheinen in Strategie und Vorhaben & Prioritäten.",
  createInitiativeAndLink: "Vorhaben erstellen & verknüpfen",
  linkExistingInitiative: "Bestehendes Vorhaben verknüpfen",
  openLinkedInitiative: "Vorhaben öffnen",
  initiativeLinkRetry: "Verknüpfung erneut versuchen",
  initiativeCreatedLinkFailed:
    "Vorhaben wurde erstellt, die Verknüpfung zum Ziel ist jedoch fehlgeschlagen.",
  preselectedTargetLabel: "Verknüpftes Ziel",
  createTargetAndLinkSchwerpunkt: "Ziel erstellen & verknüpfen",
  targetCreatedFocusLinkFailed:
    "Ziel wurde erstellt, die Verknüpfung als Schwerpunkt ist jedoch fehlgeschlagen.",
  focusLinkRetry: "Schwerpunkt-Verknüpfung erneut versuchen",
  legacyInitiativeBadge: "Legacy-Verknüpfung",
  legacyLinkRemainsAfterUnlink:
    "Die Verknüpfung in der Datenbank wurde entfernt. Eine ältere Legacy-Verknüpfung (JSON) zu diesem Vorhaben besteht weiterhin und wird in der Liste angezeigt.",
  vorhabenManagedInSectionAbove:
    "Vorhaben verwalten Sie im Abschnitt «Vorhaben» darüber — nicht über die Sitzungs-Verknüpfungen.",
  meetingsEditorSection: "Sitzungen",
  meetingsEditorHint:
    "Verknüpfe relevante Sitzungen, in denen dieses Ziel besprochen wurde.",
  unlinkInitiativeAction: "Entfernen",
} as const;

export function isSprintWorkspaceReturnPath(returnTo: string | null): boolean {
  return Boolean(returnTo?.includes("/vereinsleitung/sprints/"));
}

export function formatLinkedInitiativeCount(count: number): string {
  return count === 1 ? "1 verknüpftes Vorhaben" : `${count} verknüpfte Vorhaben`;
}