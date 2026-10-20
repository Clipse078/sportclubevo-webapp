/**
 * SCE-DESIGN-SYSTEM-07 — status, feedback, loading, empty & error metadata & audit.
 */
import {
  SCE_ACTIONABLE_ERROR_CONTRACT,
  SCE_EMPTY_STATE_DISTINCTIONS,
  SCE_INLINE_FEEDBACK_GUIDANCE,
  SCE_LOADING_HIERARCHY,
  SCE_READINESS_STATUS_PANEL_CONTRACT,
  SCE_SEMANTIC_FEEDBACK_CONTRACT,
  SCE_STATUS_BADGE_GUIDANCE,
} from "@/lib/design-system/sce-feedback-status-foundation";
import {
  SCE_FEEDBACK_MICRO_UX_DOC_MARKERS,
  SCE_FEEDBACK_MICRO_UX_GOVERNANCE,
} from "@/lib/design-system/sce-feedback-status-micro-ux";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";
import { SCE_MICRO_UX_GOVERNANCE } from "@/lib/design-system/sce-micro-ux-governance";
import { SCE_WORKSPACE_PRODUCT_WIDE_FLAGS } from "@/lib/design-system/sce-workspace-hierarchy";

export const SCE_DESIGN_SYSTEM_07_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-07" as const;
export const SCE_DESIGN_SYSTEM_07_PREDECESSOR = "SCE-DESIGN-SYSTEM-06" as const;

export const SCE_DESIGN_SYSTEM_07_PO_FLAGS = {
  ...SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
  STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE: "YES",
  READINESS_SYSTEM_CANONICAL: "YES",
  EMPTY_STATE_SYSTEM_CANONICAL: "YES",
  LOADING_SYSTEM_CANONICAL: "YES",
  ACTIONABLE_ERROR_UX_REQUIRED: "YES",
  GENERIC_INTERNAL_ERROR_AS_DEFAULT: "NO",
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
  FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED: "YES",
  RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE: "NO",
  CARD_SOUP_ALLOWED: "NO",
  FORM_CONTROL_SYSTEM_PRODUCT_WIDE: "YES",
  ACTION_SYSTEM_PRODUCT_WIDE: "YES",
  DIALOG_SYSTEM_PRODUCT_WIDE: "YES",
  CARD_SYSTEM_PRODUCT_WIDE: "YES",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  MANUAL_UAT_BY_CURSOR: "SKIPPED_PO_OWNED",
  SCREENSHOTS_BY_CURSOR: "SKIPPED_PO_OWNED",
} as const;

export const SCE_DESIGN_SYSTEM_07_PO_REVIEW = {
  DS07_STATUS: "CLOSED / ACCEPTED / MERGED",
  DS07_R1_STATUS: "CLOSED / ACCEPTED / MERGED",
  BASELINE_STAGE_HEAD: "5439f64d914a53f1dc3d029957e8a021cf0a0269",
  BRANCH: "cursor/sce-design-system-07-status-feedback-loading-empty-error",
  PREDECESSOR_DS06_PR: "884",
  PR: "885",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-08 — Tables, Lists & Dense UI",
} as const;

export const SCE_DESIGN_SYSTEM_07_PO_CLOSURE = {
  PO_DS07_VISUAL_UAT: "PASS",
  PO_DS07_R1_VISUAL_UAT: "PASS",
  PO_EMPTY_STATE_REVIEW: "PASS",
  PO_PEOPLE_ACCESS_FEEDBACK_REVIEW: "PASS",
  PO_TOURNAMENT_PLANUNG_FEEDBACK_REVIEW: "PASS",
  PO_READINESS_SYSTEM_REVIEW: "PASS",
  DS07_STATUS: "CLOSED / ACCEPTED / MERGED",
  DS07_R1_STATUS: "CLOSED / ACCEPTED / MERGED",
  PR: "885",
  ACCEPTED_BASE_IMPLEMENTATION_HEAD: "65799accf7350a6e97859d08c78be8ea42b552e2",
  ACCEPTED_R1_HEAD: "a19bff63838e1ad8a7384f29b2eb1665bb0d890d",
  FEATURE_HEAD_BEFORE_CLOSURE: "a19bff63838e1ad8a7384f29b2eb1665bb0d890d",
  /** Set on closure commit — merge SHA recorded on STAGE after PR merge. */
  CLOSURE_COMMIT: "cbbcee90a504279b0fa196bcc1cc760d7704cb07",
  STAGE_MERGE_COMMIT: "PENDING_STAGE_MERGE",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-08 — Tables, Lists & Dense UI",
} as const;

export type SceFeedbackAuditClassification =
  | "CANONICAL"
  | "CANONICAL_WITH_REFINEMENT"
  | "MIGRATE_DS07"
  | "MIGRATE_LATER_DS10"
  | "DOMAIN_SPECIFIC_CANONICAL"
  | "DUPLICATE"
  | "LEGACY_REPLACE";

export type SceFeedbackAuditEntry = {
  area: string;
  routes: string;
  classification: SceFeedbackAuditClassification;
  canonicalTarget: string;
  notes: string;
};

export const SCE_DESIGN_SYSTEM_07_STATUS_FEEDBACK_AUDIT: SceFeedbackAuditEntry[] = [
  {
    area: "Dashboard",
    routes: "/dashboard",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "SceSkeleton workspace + DashboardEmptyState",
    notes: "Command center skeleton exists — unify empty via SceEmptyState DS-10",
  },
  {
    area: "Mein Programm",
    routes: "/dashboard/mein-programm",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceEmptyState FILTERED_NO_RESULTS / NO_DATA",
    notes: "DS-07 adopts canonical empty language",
  },
  {
    area: "Teams",
    routes: "/dashboard/teams/*",
    classification: "MIGRATE_LATER_DS10",
    canonicalTarget: "SceEmptyState FIRST_USE",
    notes: "Legacy EmptyState in lists",
  },
  {
    area: "Match / Training / Tournament / Club Event",
    routes: "activity modules",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "Activity cards + domain empty copy",
    notes: "Activity-type colour ≠ feedback semantics",
  },
  {
    area: "Wochenplaner",
    routes: "/dashboard/planner/*",
    classification: "MIGRATE_LATER_DS10",
    canonicalTarget: "SceEmptyState + local loading",
    notes: "WeekPlanner EmptyState — DS-10",
  },
  {
    area: "Planning Hub",
    routes: "planning hub",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceEmptyState FILTERED_NO_RESULTS",
    notes: "DS-07 filtered empty adoption",
  },
  {
    area: "Tournament Planner",
    routes: "tournament planung",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceReadinessStatusPanel + SceSemanticFeedback",
    notes: "Setup readiness + planning UX panels",
  },
  {
    area: "Communication",
    routes: "/dashboard/communication/*",
    classification: "CANONICAL",
    canonicalTarget: "Contained workspace feedback",
    notes: "Visual reference preserved",
  },
  {
    area: "Email Sender",
    routes: "/dashboard/communication/email-sender",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceReadinessStatusPanel",
    notes: "Versandbereitschaft → canonical readiness family",
  },
  {
    area: "Publishing / Documents",
    routes: "CMS",
    classification: "MIGRATE_LATER_DS10",
    canonicalTarget: "SceEmptyState",
    notes: "SectionCard EmptyState duplicates",
  },
  {
    area: "Personen & Zugänge",
    routes: "/dashboard/admin/*",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceEmptyState NO_DATA / FILTERED_NO_RESULTS",
    notes: "Filter reset + no-results",
  },
  {
    area: "Roles / Permissions",
    routes: "administration/roles",
    classification: "MIGRATE_LATER_DS10",
    canonicalTarget: "SceSemanticFeedback",
    notes: "Inline alerts — DS-10",
  },
  {
    area: "Facilities / Admin",
    routes: "admin modules",
    classification: "MIGRATE_LATER_DS10",
    canonicalTarget: "SceEmptyState",
    notes: "OrgUnit searchable lists",
  },
  {
    area: "Infoboard",
    routes: "infoboard",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "Feed empty reasons (server)",
    notes: "Empty ≠ error semantics in feed builder",
  },
  {
    area: "Activity Composer",
    routes: "composer",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "Inline validation + toast discipline",
    notes: "No duplicate success toast + banner",
  },
  {
    area: "Email Sender / API errors",
    routes: "API",
    classification: "LEGACY_REPLACE",
    canonicalTarget: "buildSceActionableErrorPresentation",
    notes: "Generic Interner Fehler in billing APIs — DS-10",
  },
  {
    area: "Sponsor / Commercial (future)",
    routes: "future",
    classification: "MIGRATE_LATER_DS10",
    canonicalTarget: "Communication feedback patterns",
    notes: "Compatibility via DS-07 primitives",
  },
];

export type SceFeedbackInventoryRow = {
  currentComponent: string;
  domainRoutes: string;
  semantics: string;
  classification: SceFeedbackAuditClassification;
  canonicalTarget: string;
  ds07Action: string;
  futurePackage?: string;
  status: string;
};

export const SCE_DESIGN_SYSTEM_07_FEEDBACK_INVENTORY: SceFeedbackInventoryRow[] = [
  {
    currentComponent: "components/ui/page/EmptyState (90+ usages)",
    domainRoutes: "product-wide",
    semantics: "EMPTY / NO_RESULTS",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceEmptyState",
    ds07Action: "BRIDGE",
    status: "DS07_CANONICAL_BRIDGE",
  },
  {
    currentComponent: "DashboardEmptyState",
    domainRoutes: "dashboard, mein-programm",
    semantics: "NO_DATA compact",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceEmptyState",
    ds07Action: "BRIDGE",
    status: "DS07_CANONICAL_BRIDGE",
  },
  {
    currentComponent: "EmailSenderWorkspace readiness section",
    domainRoutes: "email-sender",
    semantics: "READINESS checklist",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceReadinessStatusPanel",
    ds07Action: "MIGRATED",
    status: "DS07_DONE",
  },
  {
    currentComponent: "TournamentPlanungWorkspace incomplete panel",
    domainRoutes: "planung",
    semantics: "SETUP readiness",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceReadinessStatusPanel",
    ds07Action: "MIGRATED",
    status: "DS07_DONE",
  },
  {
    currentComponent: "TournamentPlanungWorkspace planningUx panel",
    domainRoutes: "planung",
    semantics: "WARNING / READY feedback",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceSemanticFeedback",
    ds07Action: "MIGRATED",
    status: "DS07_DONE",
  },
  {
    currentComponent: "PlanningHubFilteredEmptyState",
    domainRoutes: "planning hub",
    semantics: "FILTERED_NO_RESULTS",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceEmptyState",
    ds07Action: "MIGRATED",
    status: "DS07_DONE",
  },
  {
    currentComponent: "TenantUsersSearchableList EmptyState",
    domainRoutes: "people access",
    semantics: "NO_DATA / FILTERED",
    classification: "MIGRATE_DS07",
    canonicalTarget: "SceEmptyState",
    ds07Action: "MIGRATED",
    status: "DS07_DONE",
  },
  {
    currentComponent: "LoadingSkeleton / local Skeleton copies",
    domainRoutes: "editorial, homepage-builder",
    semantics: "LOADING",
    classification: "DUPLICATE",
    canonicalTarget: "SceSkeleton",
    ds07Action: "INVENTORY",
    futurePackage: "DS-10",
    status: "REMAINING",
  },
  {
    currentComponent: "native-billing-api-errors Interner Fehler",
    domainRoutes: "billing API",
    semantics: "GENERIC_ERROR",
    classification: "LEGACY_REPLACE",
    canonicalTarget: "Actionable error contract (API layer)",
    ds07Action: "INVENTORY",
    futurePackage: "DS-10",
    status: "REMAINING",
  },
  {
    currentComponent: "AdminStatusPill on readiness headline",
    domainRoutes: "email-sender (legacy)",
    semantics: "STATUS badge",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "Text headline badge on SceReadinessStatusPanel",
    ds07Action: "MIGRATED",
    status: "DS07_DONE",
  },
  {
    currentComponent: "PersonContactTab local EmptyState function",
    domainRoutes: "person workspace",
    semantics: "DUPLICATE empty",
    classification: "DUPLICATE",
    canonicalTarget: "SceEmptyState compact",
    ds07Action: "DEFER",
    futurePackage: "DS-10",
    status: "REMAINING",
  },
];

export const SCE_DESIGN_SYSTEM_07_DOC_MARKERS = [
  "SCE-DESIGN-SYSTEM-07",
  "STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE",
  "READINESS_SYSTEM_CANONICAL",
  "EMPTY_STATE_SYSTEM_CANONICAL",
  "LOADING_SYSTEM_CANONICAL",
  "SceReadinessStatusPanel",
  "SceEmptyState",
  "SceActionableError",
  "SceSemanticFeedback",
  "SceSkeleton",
  "ACTIONABLE_ERROR_UX_REQUIRED",
  "GENERIC_INTERNAL_ERROR_AS_DEFAULT",
  "SCE-DESIGN-SYSTEM-07-FEEDBACK-INVENTORY",
  ...SCE_FEEDBACK_MICRO_UX_DOC_MARKERS,
] as const;

export const SCE_DESIGN_SYSTEM_07_GOVERNANCE = {
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
  STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE: "YES",
  READINESS_SYSTEM_CANONICAL: "YES",
  EMPTY_STATE_SYSTEM_CANONICAL: "YES",
  LOADING_SYSTEM_CANONICAL: "YES",
  LOADING_SYSTEM_PRODUCT_WIDE: "YES",
  DS10_FINAL_ADOPTION_REQUIRED: "YES",
  ACTIONABLE_ERROR_UX_REQUIRED: "YES",
  GENERIC_INTERNAL_ERROR_AS_DEFAULT: "NO",
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
  FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED: "YES",
  RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE: "NO",
  CARD_SOUP_ALLOWED: "NO",
  PARALLEL_EMPTY_STATE_PRIMITIVE: "NO",
  PARALLEL_READINESS_PRIMITIVE: "NO",
  NEW_BINARY_CHECKBOXES: 0,
  BINARY_CONTROL_COMPLIANCE: "PASS",
  CANONICAL_TOGGLES_USED: "YES",
  SEMANTIC_FEEDBACK: SCE_SEMANTIC_FEEDBACK_CONTRACT,
  EMPTY_STATE: SCE_EMPTY_STATE_DISTINCTIONS,
  LOADING: SCE_LOADING_HIERARCHY,
  READINESS_PANEL: SCE_READINESS_STATUS_PANEL_CONTRACT,
  ACTIONABLE_ERROR: SCE_ACTIONABLE_ERROR_CONTRACT,
  INLINE_FEEDBACK: SCE_INLINE_FEEDBACK_GUIDANCE,
  STATUS_BADGE: SCE_STATUS_BADGE_GUIDANCE,
  BINARY_CHECKBOX_DEFERRED: SCE_BINARY_CHECKBOX_COUNTS.BINARY_SETTING_CHECKBOXES_DEFERRED,
  RESPONSIVE_COMPLIANCE: "PARTIAL_DS09_FINAL",
  ACCESSIBILITY_COMPLIANCE: "PARTIAL_DS09_FINAL",
  ...SCE_FEEDBACK_MICRO_UX_GOVERNANCE,
} as const;

export const SCE_DESIGN_SYSTEM_07_WORLD_CLASS_MICRO_UX = {
  ...SCE_MICRO_UX_GOVERNANCE,
  FEEDBACK_MICRO_UX: SCE_FEEDBACK_MICRO_UX_GOVERNANCE,
} as const;

export const SCE_DESIGN_SYSTEM_07_REPRESENTATIVE_ADOPTION = {
  EMAIL_SENDER: "Versandbereitschaft → SceReadinessStatusPanel (visual parity, canonical primitive)",
  TOURNAMENT_PLANUNG:
    "Setup readiness + planningUx → SceReadinessStatusPanel / SceSemanticFeedback",
  PEOPLE_ACCESS: "TenantUsersSearchableList → SceEmptyState variants + filter reset",
  MEIN_PROGRAMM: "PersonalProgrammeListeView → SceEmptyState via DashboardEmptyState bridge",
  PLANNING_HUB: "PlanningHubFilteredEmptyState → SceEmptyState FILTERED_NO_RESULTS",
  ACTIONABLE_ERROR: "TournamentPlanungSetupDialog load failure → SceActionableError + retry",
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
} as const;

export const SCE_DESIGN_SYSTEM_07_CANONICAL_FEEDBACK_PRIMITIVES = {
  SEMANTIC_FEEDBACK: "SceSemanticFeedback",
  READINESS_PANEL: "SceReadinessStatusPanel",
  EMPTY_STATE: "SceEmptyState",
  ACTIONABLE_ERROR: "SceActionableError",
  SKELETON: "SceSkeleton",
  LEGACY_EMPTY_BRIDGE: "EmptyState (ui/page → SceEmptyState)",
  LEGACY_LOADING_BRIDGE: "LoadingSkeleton (delegated by SceSkeleton recipes)",
} as const;
