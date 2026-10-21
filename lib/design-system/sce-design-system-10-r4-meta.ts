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
