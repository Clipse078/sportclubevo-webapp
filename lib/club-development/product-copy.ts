/**
 * SCE-CD-04R3 — Vereinsentwicklung user-facing German product copy.
 * Presentation labels only; routes, enums and API keys stay unchanged.
 */

/** Connected Vereinsentwicklung — per-tab page descriptions (ListPagePattern). */
export const CD_CONNECTED_WORKSPACE_VIEW_COPY = {
  uebersicht:
    "Mitgliederentwicklung, Ziele und nächste Schritte im Überblick.",
  aufgaben: "Aufgaben zu Zielen und Strategien verwalten.",
  umsetzungsplanung: "Aufgaben priorisieren und in Umsetzungsphasen einplanen.",
} as const;

/** Leadership Übersicht dashboard section chrome. */
export const CD_LEADERSHIP_DASHBOARD_COPY = {
  umsetzungProgressLabel: "Umsetzungsfortschritt",
  openPersonsAction: "Personen öffnen",
  personsListHref: "/dashboard/persons",
} as const;

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
} as const;

/** Vereinsentwicklung — Sitzungen list & workspace chrome. */
export const CD_MEETINGS_WORKSPACE_COPY = {
  pageSubtitle: "Sitzungen planen, Beschlüsse festhalten und Aufgaben verfolgen.",
  listSectionTitle: "Alle Sitzungen",
  summarySectionTitle: "Sitzungsübersicht",
  createAction: "Neue Sitzung",
  createContext: "Termin für die Vereinsleitung erfassen",
} as const;

/** PKG-01 — navigation hub copy (routes unchanged). */
export const CD_OVERVIEW_SHORTCUT_COPY = {
  strategyDescription: "Ausrichtung, Ziele, Kennzahlen und Fortschritt im Überblick.",
  backlogDescription: "Priorisierte Vorhaben mit Einordnung und Erwartetem Ergebnis.",
  sprintDescription: "Umsetzungsphasen planen, Aufgaben zuordnen und abschließen.",
  workHubDescription: "Vorhaben, Aufgaben und Umsetzungsphasen in einem Arbeitsbereich.",
} as const;

/** Consolidated Vorhaben & Umsetzung workspace — page-level subtitle only. */
export const CD_VORHABEN_UMSETZUNG_WORKSPACE_COPY = {
  pageSubtitle: "Vorhaben priorisieren, Aufgaben erledigen und Umsetzung planen.",
} as const;

/** Consolidated Umsetzungsplanung tab inside Vorhaben & Umsetzung. */
export const CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY = {
  ongoingSection: "Laufende Umsetzungsphase",
  futureSection: "Geplante Umsetzungsphasen",
  completedSection: "Abgeschlossene Umsetzungsphasen",
  unplannedSection: "Ungeplant",
  unplannedSummary: "Übergeordnete Aufgaben ohne Zuordnung zu einer geplanten oder laufenden Phase.",
  noActivePhase: "Keine laufende Umsetzungsphase.",
  noFuturePhases: "Keine geplanten Umsetzungsphasen.",
  noCompletedPhases: "Noch keine abgeschlossenen Umsetzungsphasen.",
  createPhaseAction: "Phase erstellen",
  moveSelectedTasksAction: "Auswahl verschieben",
  removeAssignmentAction: "Zuordnung entfernen",
  chooseMoveTargetPhase: "Ziel-Umsetzungsphase",
  unplannedLoadError: "Ungeplante Aufgaben konnten nicht geladen werden.",
  sprintsReadyEmptyHint: "Für Ihre Berechtigung sind keine Phasen in dieser Kategorie vorhanden.",
  assignToPhaseAction: "Zur Umsetzungsphase hinzufügen",
  choosePhaseTarget: "Ziel-Umsetzungsphase",
  assignSelectedAction: "Auswahl zuordnen",
  einplanenAction: "Einplanen",
  einplanenSuccess: "Aufgabe eingeplant.",
  expandUnplannedAction: "Ungeplante Aufgaben anzeigen",
  planningDetailLink: "Zur Planung",
  assignedTasksSection: "Zugeordnete Aufgaben",
  assignedTasksLoading: "Aufgaben werden geladen …",
  noAssignedTasks: "Noch keine Aufgaben dieser Umsetzungsphase zugeordnet.",
  phaseEditAction: "Umsetzungsphase bearbeiten",
} as const;

/** PKG-02 — CD-WORK Vorhaben & Aufgaben workspace copy. */
export const CD_VORHABEN_WORKSPACE_COPY = {
  targetFilterHint: "Anzeige auf Vorhaben mit Verknüpfung zum gewählten strategischen Ziel.",
  searchPlaceholder: "Vorhaben oder Aufgaben suchen …",
  tasksSearchPlaceholder: "Aufgaben suchen …",
  allInitiatives: "Alle sichtbaren Vorhaben",
  anyOpenTaskStatus: "Aktive Aufgaben (ohne Abbruch)",
  focusInitiative: "Fokus:",
  initiativesHeading: "Vorhaben",
  tasksHeading: "Zugehörige Aufgaben",
  tasksSubheading: "Zugehörige Aufgaben zu den gelisteten Vorhaben.",
  emptyInitiatives: "Keine Vorhaben für die aktuelle Filterung sichtbar.",
  emptyTasks: "Keine passenden Aufgaben — prüfen Sie Filter oder Verknüpfungen im Vorhaben-Detail.",
  emptyTasksUnfiltered: "Noch keine Aufgaben sichtbar.",
  clearFiltersAction: "Filter zurücksetzen",
  createTaskAction: "+ Aufgabe erstellen",
  rootTasksTruncationNotice: (shown: number, total: number) =>
    `Es werden ${shown} von ${total} übergeordneten Aufgaben angezeigt.`,
  allRootTasksAction: "Alle übergeordneten Aufgaben anzeigen",
  moreFiltersAction: "Weitere Filter",
  hideFiltersAction: "Filter einklappen",
  noInitiativeAccess: "Keine Berechtigung zur Vorhaben-Ansicht.",
  noTaskAccess: "Keine Berechtigung zur Aufgaben-Ansicht.",
} as const;

export const CD_INITIATIVE_COPY = {
  singular: "Vorhaben",
  plural: "Vorhaben",
  dispositionFilter: "Einordnung",
  createInBacklog: "Vorhaben erstellen",
  createNew: "Neues Vorhaben",
  createAction: "Vorhaben erstellen",
  saveChanges: "Änderungen speichern",
  notFound: "Vorhaben nicht gefunden",
  notFoundHeading: "Dieses Vorhaben ist noch nicht erfasst",
  deleteTitle: "Vorhaben endgültig löschen",
  deleteFailed: "Vorhaben konnte nicht gelöscht werden.",
  emptyBacklogManage: "Keine Vorhaben sichtbar. Erfassen Sie das erste Vorhaben oben.",
  emptyBacklogView: "Keine sichtbaren Vorhaben für die aktuelle Filterung.",
  composerTitle: "Neues Vorhaben",
  composerDescription: "Vorhaben direkt in der Übersicht erfassen.",
  prioritaetenCreateContext: "Priorität und erwartetes Ergebnis optional mit erfassen.",
  ownerTextFilterLabel: "Verantwortlich",
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
  noGoalRecorded: "Noch kein Phasenziel erfasst.",
  addExistingTaskToPhase: "Bestehende Aufgabe hinzufügen",
  createNewTaskInPhase: "Neue Aufgabe erstellen",
  reviewUnavailablePlanned:
    "Der Rückblick öffnet sich nach Abschluss der Umsetzungsphase. Starten Sie die Phase zuerst in der Planung.",
  reviewUnavailableActive:
    "Der Rückblick ist verfügbar, sobald die Umsetzungsphase abgeschlossen ist.",
  addedAfterStart: "Nach Start hinzugefügt",
  committedAtStart: "Zum Start eingeplant",
  scopeAtStart: "Aufgabenumfang zum Start",
  scopeChanges: "Änderungen am Aufgabenumfang",
  futurePhase: "künftige Umsetzungsphase",
  futurePhaseTitle: "Künftige Umsetzungsphase",
  expectedResult: "Erwartetes Ergebnis",
  metrics: "Kennzahlen",
  boardQuickLink: "Aufgabenboard",
  boardPageDescription: "Aufgaben nach Status — Offen, In Arbeit, Erledigt.",
  phaseGoalLabel: "Phasenziel",
  phaseGoalEditAction: "Phasenziel bearbeiten",
  reviewQuickLink: "Zum Rückblick",
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
  deletePhase: "Umsetzungsphase löschen",
  deletePhaseConfirmTitle: "Umsetzungsphase endgültig löschen?",
  deletePhaseConfirmBody:
    "Die Umsetzungsphase wird dauerhaft entfernt. Zugeordnete Aufgaben und Unteraufgaben bleiben im Verein erhalten.",
  deletePhaseTasksPreserved: "Aufgaben bleiben erhalten",
} as const;

export const CD_TASK_WORKSPACE_COPY = {
  primaryInitiative: "Primäres Vorhaben",
  assignedImplementationPhase: "Zugeordnete Umsetzungsphase",
  priorImplementationPhases: "Frühere Umsetzungsphasen",
  returnToImplementationPhase: "Zurück zur Umsetzungsphase",
  dueAt: "Fällig am",
  deleteTask: "Aufgabe löschen",
  deleteTaskConfirmTitle: "Aufgabe endgültig löschen?",
  deleteTaskConfirmBody:
    "Die Aufgabe wird dauerhaft entfernt. Unteraufgaben werden nicht mitgelöscht — löschen Sie zuerst alle Unteraufgaben.",
  deleteTaskBlockedSubtasks:
    "Löschen ist nicht möglich, solange Unteraufgaben an dieser Aufgabe hängen.",
  deleteTaskPermissionGapHint:
    "Dauerhaftes Löschen erfordert die Berechtigung «Aufgaben dauerhaft löschen» (tasks.delete). Diese ist in diesem Mandanten noch nicht freigeschaltet.",
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
  linkExistingTargetToStrategy: "Bestehendes Ziel verknüpfen",
  createTargetInStrategy: "+ Ziel anlegen",
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
  aufgabenSectionHeading: "Aufgaben",
  aufgabenEmpty: "Noch keine Aufgaben",
  createTaskAfterZielAction: "Jetzt Aufgabe erstellen",
  createdByLabel: "Erstellt von",
} as const;

export function isSprintWorkspaceReturnPath(returnTo: string | null): boolean {
  return Boolean(returnTo?.includes("/vereinsleitung/sprints/"));
}

export function formatLinkedInitiativeCount(count: number): string {
  return count === 1 ? "1 verknüpftes Vorhaben" : `${count} verknüpfte Vorhaben`;
}