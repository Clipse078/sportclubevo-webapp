/**
 * SCE-DESIGN-SYSTEM-06-R2 — visible surface convergence + smart tournament field preparation.
 */
import { SCE_DESIGN_SYSTEM_06_R1_GOVERNANCE } from "@/lib/design-system/sce-design-system-06-r1-meta";

export const SCE_DESIGN_SYSTEM_06_R2_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-06-R2" as const;

export const SCE_DESIGN_SYSTEM_06_R2_SURFACE_GOVERNANCE = {
  FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED: "YES",
  RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE: "NO",
  CARD_SOUP_ALLOWED: "NO",
  TOURNAMENT_PLANUNG_RESOURCE_SURFACE_CONVERGENCE: "YES",
} as const;

export const SCE_DESIGN_SYSTEM_06_R2_SMART_FIELD_PREPARATION = {
  RECOMMENDED_FIELD_COUNT_AUTO_PREPARED: "YES",
  AUTOMATIC_FIRST_MANUAL_SECOND: "YES",
  TOURNAMENT_PITCH_RESOURCE_SEPARATION_PRESERVED: "YES",
  EXISTING_USER_PITCHES_PRESERVED: "YES",
  FIELD_PREPARATION_IDEMPOTENT: "YES",
  SILENT_FACILITY_ASSIGNMENT: "NO",
  SILENT_FORMAT_INFERENCE: "NO",
  PARALLEL_SCHEDULE_TRUTH_INTRODUCED: "NO",
} as const;

export const SCE_DESIGN_SYSTEM_06_R2_PO_REVIEW = {
  DS06_R2_STATUS: "READY_FOR_PO_REVIEW",
  BRANCH: "cursor/sce-design-system-06-actions-dialogs-composer",
  PR: "884",
  /** Set after R2 commits land — PO review gate. */
  R2_STARTING_HEAD_FULL: "10e21d1d9d212ae8db2f04290711e21603bdc906",
  FEATURE_HEAD_FULL: "a8dbd4b64f6e72e6efb71ac12de53232d9682eea",
} as const;

export const SCE_DESIGN_SYSTEM_06_R2_GOVERNANCE = {
  ...SCE_DESIGN_SYSTEM_06_R1_GOVERNANCE,
  ...SCE_DESIGN_SYSTEM_06_R2_SURFACE_GOVERNANCE,
  ...SCE_DESIGN_SYSTEM_06_R2_SMART_FIELD_PREPARATION,
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
  WORLD_CLASS_MICRO_UX_REQUIRED: "YES",
  LOCAL_MICRO_PATTERN_DRIFT_ALLOWED: "NO",
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
} as const;

/** DS-10 audit category — classify only in R2; migrate in DS-10. */
export const SCE_DESIGN_SYSTEM_06_R2_UNCONTAINED_SURFACE_AUDIT_CATEGORY =
  "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND" as const;

export const SCE_DESIGN_SYSTEM_06_R2_SURFACE_DEBT_SNAPSHOT: readonly {
  area: string;
  routes: string;
  classification: typeof SCE_DESIGN_SYSTEM_06_R2_UNCONTAINED_SURFACE_AUDIT_CATEGORY | "CONTAINED" | "INTENTIONAL_OPEN";
  notes: string;
}[] = [
  {
    area: "Dashboard / Mein Programm",
    routes: "/dashboard, /dashboard/mein-programm",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "KPI rows and programme lists — partial module canvas; DS-10 section surfaces",
  },
  {
    area: "Teams",
    routes: "/dashboard/teams/*",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Cockpit tabs mix surfaced panels with open rails",
  },
  {
    area: "Match / Training",
    routes: "matchcenter, trainingscenter",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Record tabs — some editors on decorative shell",
  },
  {
    area: "Tournament",
    routes: "tournamentcenter record planung",
    classification: "CONTAINED",
    notes: "DS-06-R2 — Planung Ressourcen → PlanningEditorSection; readiness panel SCE_SURFACE_STANDARD_PANEL",
  },
  {
    area: "Club Event",
    routes: "veranstaltungen",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Mixed record sections without consistent workspace panel",
  },
  {
    area: "Wochenplaner / Planning Hub",
    routes: "/dashboard/planner/*",
    classification: "INTENTIONAL_OPEN",
    notes: "Dense operational grids — open canvas by design; sub-panels use dense tokens",
  },
  {
    area: "Tournament Planner",
    routes: "planung board",
    classification: "INTENTIONAL_OPEN",
    notes: "Matrices/boards remain open; surrounding chrome uses SCE surfaces",
  },
  {
    area: "Communication",
    routes: "/dashboard/communication/*",
    classification: "CONTAINED",
    notes: "Primary visual reference — CommunicationContentSurface",
  },
  {
    area: "Publishing / Documents",
    routes: "CMS, documents",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Builder panels and DAM lists",
  },
  {
    area: "Personen & Zugänge",
    routes: "/dashboard/admin/users",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Improving — list/KPI surfaces; detail panes still mixed",
  },
  {
    area: "Roles / Permissions",
    routes: "administration/roles",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Dense matrix on shell — DS-10 containment strategy",
  },
  {
    area: "Facilities / Admin",
    routes: "admin-facilities",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Table-first admin on decorative background",
  },
  {
    area: "Infoboard",
    routes: "infoboard",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Designer chrome",
  },
  {
    area: "Sponsor / Commercial (future)",
    routes: "future CMS",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Not built — follow Communication hierarchy",
  },
  {
    area: "Team / Person workspaces (future)",
    routes: "future",
    classification: "UNCONTAINED_FUNCTIONAL_CONTENT_ON_DECORATIVE_BACKGROUND",
    notes: "Planned calm headers + section panels",
  },
] as const;
