/**
 * SCE-DESIGN-SYSTEM-10 — R4 Aufgaben / Anforderungen workspace convergence (PO visual baseline).
 */
export const SCE_DESIGN_SYSTEM_10_R4_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-10-R4" as const;

export const SCE_DESIGN_SYSTEM_10_R4_PO_AUFGABEN_BASELINE = {
  SOURCE: "PO visual review — Aufgaben / Anforderungen (R4 input)",
  PRESERVE_STRONG_SURFACES: [
    "Aufgabenverwaltung operational overview",
    "dense task list",
    "expanded subtask presentation",
    "task-detail overlay",
    "Neue Aufgabe modal",
  ] as const,
} as const;

export const SCE_DESIGN_SYSTEM_10_R4_WORKSPACE_LOCKS = {
  AUFGABEN_SINGLE_WORKSPACE: "YES",
  AUFGABEN_PRIMARY_CONTEXTS: "MEINE_AUFGABEN | VERWALTUNG",
  ANFORDERUNGEN_AS_PARALLEL_PRIMARY_WORKSPACE: "NO",
  AUFGABEN_CONTEXT_STRUCTURE_STABLE: "YES",
  TAB_SWITCH_REORDERS_WORKSPACE_HIERARCHY: "NO",
  LOCAL_PARALLEL_PAGE_SHELLS_ALLOWED: "NO",
  RAW_INLINE_ERROR_TEXT_AS_PRIMARY_ERROR_UI: "NO",
  ACTIONABLE_ERROR_PATTERN_REQUIRED: "YES",
  ERROR_NEAREST_MEANINGFUL_CONTEXT: "YES",
} as const;

export const SCE_DESIGN_SYSTEM_10_R4_CANONICAL_PRIMITIVES = {
  WORKSPACE_SHELL: "AufgabenWorkspaceShell",
  WORKSPACE_CHROME: "SceWorkspaceChrome",
  CONTEXT_TABS: "AufgabenWorkspaceContextTabs → SceContextTabs",
  LOAD_ERRORS: "AufgabenDomainLoadError → SceActionableError",
  PERSONAL_FILTERS: "PersonalInboxFilterNav (secondary tier)",
} as const;

export const SCE_DESIGN_SYSTEM_10_R4_ROUTE_FAMILY = [
  "/dashboard/aufgaben",
  "/dashboard/aufgaben/neu",
  "/dashboard/aufgaben/anforderungen/neu",
] as const;

/** R4.1 PO UAT corrections — modal scroll, task detail containment, shared creation language. */
export const SCE_DESIGN_SYSTEM_10_R4_1_UAT_LOCKS = {
  AUFGABE_CREATION_MODAL: "YES",
  ANFORDERUNG_CREATION_MODAL: "YES",
  AUFGABEN_CREATION_LANGUAGE_CONSISTENT: "YES",
  PARALLEL_REQUIREMENT_CREATION_UI: "NO",
  TASK_DETAIL_HEADER_CONTENT_OVERLAP: "NO",
  MODAL_BODY_SCROLLABLE: "YES",
  TASK_TYPE_SEMANTIC_COLOUR_REQUIRED: "YES",
} as const;
