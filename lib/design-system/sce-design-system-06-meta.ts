/**
 * SCE-DESIGN-SYSTEM-06 — actions, dialogs & composer metadata & audit.
 */
import {
  SCE_COMPOSER_ARCHITECTURE_FLAGS,
  SCE_CONFIRMATION_PRIMITIVE,
  SCE_DIALOG_ARCHITECTURE,
  SCE_NESTED_DIALOG_INVENTORY,
  SCE_NESTED_DIALOG_POLICY,
} from "@/lib/design-system/sce-action-dialog-foundation";
import {
  SCE_ACTION_DIALOG_MICRO_PATTERNS_CANONICALISED,
  SCE_ACTION_DIALOG_MICRO_PATTERNS_DEFERRED,
  SCE_ACTION_DIALOG_MICRO_UX_DOC_MARKERS,
  SCE_ACTION_DIALOG_MICRO_UX_GOVERNANCE,
  SCE_ACTION_MICRO_STATE_MATRIX,
  SCE_COMPOSER_MICRO_STATE_MATRIX,
  SCE_DIALOG_MICRO_STATE_MATRIX,
} from "@/lib/design-system/sce-action-dialog-micro-ux";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";
import { SCE_MICRO_UX_GOVERNANCE } from "@/lib/design-system/sce-micro-ux-governance";
import { SCE_WORKSPACE_PRODUCT_WIDE_FLAGS } from "@/lib/design-system/sce-workspace-hierarchy";

export const SCE_DESIGN_SYSTEM_06_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-06" as const;

export const SCE_DESIGN_SYSTEM_06_PREDECESSOR = "SCE-DESIGN-SYSTEM-05" as const;

export const SCE_DESIGN_SYSTEM_06_CANONICAL_ACTION_DIALOG_PRIMITIVES = {
  BUTTON: "Button",
  ACTION_LINK: "SceActionLink",
  ICON_ACTION: "SceIconButton",
  PAGE_ACTIONS: "PageActions",
  WORKSPACE_HEADER_ACTIONS: "SceWorkspaceHeader",
  OVERFLOW_MENU: "SceOverflowMenu",
  DIALOG_SHELL: "Dialog",
  MODAL_OVERLAY: "SceModalOverlay",
  MODAL_FOCUS: "useSceModalDialog",
  CONFIRMATION: SCE_CONFIRMATION_PRIMITIVE,
  COMPOSER: "SceActivityComposer",
  DRAWER: "Sheet",
  DIRTY_GUARD: "SceContextDirtyGuardProvider",
} as const;

export const SCE_DESIGN_SYSTEM_06_PO_FLAGS = {
  ...SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
  ACTION_SYSTEM_PRODUCT_WIDE: "YES",
  DIALOG_SYSTEM_PRODUCT_WIDE: "YES",
  ACTIVITY_COMPOSER_CANONICAL: "YES",
  FORM_CONTROL_SYSTEM_PRODUCT_WIDE: "YES",
  CARD_SYSTEM_PRODUCT_WIDE: "YES",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  ACTIVITY_CARD_FAMILY_CANONICAL: "YES",
  WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE: "PASS",
  MANUAL_UAT_BY_CURSOR: "SKIPPED_PO_OWNED",
  SCREENSHOTS_BY_CURSOR: "SKIPPED_PO_OWNED",
} as const;

export const SCE_DESIGN_SYSTEM_06_PO_REVIEW = {
  DS06_STATUS: "READY_FOR_PO_REVIEW",
  BASELINE_STAGE_HEAD: "896d51e70586e28a78511cdea3f621b826483366",
  BRANCH: "cursor/sce-design-system-06-actions-dialogs-composer",
  PREDECESSOR_DS05_PR: "883",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-07 — Status, Feedback & System States",
} as const;

export type SceActionDialogAuditClassification =
  | "CANONICAL"
  | "CANONICAL_WITH_REFINEMENT"
  | "MIGRATE_DS06"
  | "MIGRATE_LATER"
  | "DOMAIN_SPECIFIC_CANONICAL"
  | "DUPLICATE"
  | "DEPRECATE";

export type SceActionDialogAuditEntry = {
  area: string;
  routes: string;
  classification: SceActionDialogAuditClassification;
  canonicalTarget: string;
  notes: string;
};

/** Product-wide action / dialog audit (DS-06 + DS-10 gate). */
export const SCE_DESIGN_SYSTEM_06_ACTION_DIALOG_AUDIT: SceActionDialogAuditEntry[] = [
  {
    area: "Dashboard",
    routes: "/dashboard",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "PageActions + Button",
    notes: "Quick access icon actions — adopt SceIconButton DS-10",
  },
  {
    area: "Mein Programm",
    routes: "/dashboard/mein-programm",
    classification: "CANONICAL",
    canonicalTarget: "Toolbar filters + row navigation",
    notes: "Operational calm — tertiary links for open",
  },
  {
    area: "Teams",
    routes: "/dashboard/teams/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "SceWorkspaceHeader actions",
    notes: "Create flows → Composer",
  },
  {
    area: "Match / Training / Tournament / Club Event",
    routes: "activity modules",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "SceActivityComposer",
    notes: "ONE creation language — domain workflows preserved",
  },
  {
    area: "Wochenplaner / Planning Hub",
    routes: "/dashboard/planner/*",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "Dialog + elevated manipulation shell",
    notes: "Dense operational UX; nested dialog inventory",
  },
  {
    area: "Tournament Planner",
    routes: "tournament planung",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "Button + Dialog confirmations",
    notes: "Save/print/PDF/copy — canonical hierarchy without density loss",
  },
  {
    area: "Communication",
    routes: "/dashboard/communication/*",
    classification: "CANONICAL",
    canonicalTarget: "Button / SceActionLink hierarchy",
    notes: "Primary visual reference for action calmness",
  },
  {
    area: "Email Sender",
    routes: "/dashboard/communication/email-sender",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "Form footer Button actions",
    notes: "Save/send primary — secondary navigation ghost",
  },
  {
    area: "Publishing / Documents",
    routes: "CMS, workspace",
    classification: "MIGRATE_LATER",
    canonicalTarget: "Dialog + overflow menus",
    notes: "Floating context menus — DS-10",
  },
  {
    area: "Personen & Zugänge",
    routes: "/dashboard/admin/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "SceConfirmDialog destructive",
    notes: "UserRowActionsMenu DS-06 adoption",
  },
  {
    area: "Roles / Permissions",
    routes: "administration/roles",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "SwitchToggle + privileged enable confirm",
    notes: "Inline confirm callbacks — migrate to SceConfirmDialog DS-10",
  },
  {
    area: "Facilities / Admin",
    routes: "admin modules",
    classification: "MIGRATE_LATER",
    canonicalTarget: "Form footer + Dialog",
    notes: "Mixed legacy button classes",
  },
  {
    area: "Infoboard administration",
    routes: "infoboard designer",
    classification: "MIGRATE_LATER",
    canonicalTarget: "Button + dirty guard",
    notes: "Designer save bar — DS-10",
  },
  {
    area: "Sponsor / Commercial (future)",
    routes: "future",
    classification: "MIGRATE_LATER",
    canonicalTarget: "CMS config actions",
    notes: "Follow Communication hierarchy",
  },
  {
    area: "Team / Person workspace (future)",
    routes: "future",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "SceWorkspaceHeader + overflow",
    notes: "Context tabs + row menus",
  },
  {
    area: "Activity Composer",
    routes: "/new, SceActivityComposer",
    classification: "CANONICAL",
    canonicalTarget: "SceActivityComposerFooter + dirty guard",
    notes: "Architecture preserved — DS-06 micro markers only",
  },
];

export type SceActionDialogInventoryRow = {
  currentComponent: string;
  domainRoutes: string;
  semantics: string;
  classification: SceActionDialogAuditClassification;
  canonicalTarget: string;
  ds06Action: string;
  futurePackage?: string;
  status: string;
  justifiedException?: string;
};

export const SCE_DESIGN_SYSTEM_06_LEGACY_ACTION_DIALOG_INVENTORY: SceActionDialogInventoryRow[] =
  [
    {
      currentComponent: "Communication hub raw Link primary/secondary",
      domainRoutes: "/dashboard/communication",
      semantics: "PRIMARY + SECONDARY workspace actions",
      classification: "MIGRATE_DS06",
      canonicalTarget: "SceActionLink",
      ds06Action: "MIGRATED",
      status: "DS06_DONE",
    },
    {
      currentComponent: "UserRowActionsMenu inline confirm Dialog",
      domainRoutes: "/dashboard/admin/users",
      semantics: "DESTRUCTIVE_REQUIRES_CONFIRMATION",
      classification: "MIGRATE_DS06",
      canonicalTarget: "SceConfirmDialog + SceOverflowMenu",
      ds06Action: "MIGRATED",
      status: "DS06_DONE",
    },
    {
      currentComponent: "TurniereTournamentRecordDeleteDialog",
      domainRoutes: "tournament record",
      semantics: "DESTRUCTIVE_CONFIRMATION",
      classification: "MIGRATE_DS06",
      canonicalTarget: "SceConfirmDialog",
      ds06Action: "MIGRATED",
      status: "DS06_DONE",
    },
    {
      currentComponent: "Local overflow trigger recipes (h-8 w-8 ad hoc)",
      domainRoutes: "planning hub, match rows",
      semantics: "OVERFLOW_MENU",
      classification: "MIGRATE_LATER",
      canonicalTarget: "SceOverflowMenu",
      ds06Action: "INVENTORY",
      futurePackage: "DS-10",
      status: "REMAINING",
    },
    {
      currentComponent: "RegistrationWorkflowPanel inline confirm panel",
      domainRoutes: "registrations",
      semantics: "DECISION",
      classification: "MIGRATE_LATER",
      canonicalTarget: "SceConfirmDialog",
      ds06Action: "DEFER",
      futurePackage: "DS-10",
      status: "REMAINING",
    },
    {
      currentComponent: "SceClubTeamSelectorDialog elevated over Composer",
      domainRoutes: "activity create",
      semantics: "FORM_DIALOG nested",
      classification: "DOMAIN_SPECIFIC_CANONICAL",
      canonicalTarget: "stackLayer elevated",
      ds06Action: "JUSTIFIED_EXCEPTION",
      status: "INVENTORY",
      justifiedException: "Club discovery — prefer secondaryPanel DS-10",
    },
    {
      currentComponent: "PlanningHubManipulationModalShell elevated",
      domainRoutes: "planning hub",
      semantics: "FORM_DIALOG nested",
      classification: "DOMAIN_SPECIFIC_CANONICAL",
      canonicalTarget: "stackLayer elevated",
      ds06Action: "JUSTIFIED_EXCEPTION",
      status: "INVENTORY",
      justifiedException: "Operational conflict workspace",
    },
    {
      currentComponent: "Raw sce-btn-primary / fca-button-primary links",
      domainRoutes: "communication lists, legacy admin",
      semantics: "PRIMARY duplicate styling",
      classification: "DUPLICATE",
      canonicalTarget: "Button / SceActionLink",
      ds06Action: "PARTIAL",
      futurePackage: "DS-10",
      status: "REMAINING",
    },
  ];

export const SCE_DESIGN_SYSTEM_06_DOC_MARKERS = [
  "SCE-DESIGN-SYSTEM-06",
  "ACTION_SYSTEM_PRODUCT_WIDE",
  "DIALOG_SYSTEM_PRODUCT_WIDE",
  "SceConfirmDialog",
  "SceIconButton",
  "SceOverflowMenu",
  "SceActionLink",
  "SCE_ACTION_HIERARCHY",
  "SCE_DIALOG_ARCHITECTURE",
  "SCE_NESTED_DIALOG_POLICY",
  "ACTIVITY_COMPOSER_CANONICAL",
  "SCE-DESIGN-SYSTEM-06-ACTION-DIALOG-INVENTORY",
  ...SCE_ACTION_DIALOG_MICRO_UX_DOC_MARKERS,
] as const;

export const SCE_DESIGN_SYSTEM_06_GOVERNANCE = {
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
  ACTION_SYSTEM_PRODUCT_WIDE: "YES",
  DIALOG_SYSTEM_PRODUCT_WIDE: "YES",
  ACTIVITY_COMPOSER_CANONICAL: "YES",
  PARALLEL_PATTERN_INTRODUCED: "NO",
  PARALLEL_MODAL_SYSTEM: "NO",
  NEW_BINARY_CHECKBOXES: 0,
  BINARY_CONTROL_COMPLIANCE: "PASS",
  CANONICAL_TOGGLES_USED: "YES",
  FORM_CONTROL_SYSTEM_PRODUCT_WIDE: "YES",
  CARD_SYSTEM_PRODUCT_WIDE: "YES",
  WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE: "PASS",
  WORKSPACE_SYSTEM_PRODUCT_WIDE: "YES",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  DIALOG_ARCHITECTURE: SCE_DIALOG_ARCHITECTURE,
  NESTED_DIALOG_POLICY: SCE_NESTED_DIALOG_POLICY,
  NESTED_DIALOG_INVENTORY: SCE_NESTED_DIALOG_INVENTORY,
  COMPOSER_FLAGS: SCE_COMPOSER_ARCHITECTURE_FLAGS,
  BINARY_CHECKBOX_DEFERRED: SCE_BINARY_CHECKBOX_COUNTS.BINARY_SETTING_CHECKBOXES_DEFERRED,
  RESPONSIVE_COMPLIANCE: "PARTIAL_DS09_FINAL",
  ACCESSIBILITY_COMPLIANCE: "PARTIAL_DS09_FINAL",
  UNEXPLAINED_LEGACY_ACTION_DIALOG_FAMILIES_ALLOWED_AT_DS10_CLOSURE: "NO",
  ...SCE_ACTION_DIALOG_MICRO_UX_GOVERNANCE,
} as const;

export const SCE_DESIGN_SYSTEM_06_WORLD_CLASS_MICRO_UX = {
  ...SCE_MICRO_UX_GOVERNANCE,
  ACTION_MICRO_STATES_AUDITED: SCE_ACTION_MICRO_STATE_MATRIX,
  DIALOG_MICRO_STATES_AUDITED: SCE_DIALOG_MICRO_STATE_MATRIX,
  COMPOSER_MICRO_STATES_AUDITED: SCE_COMPOSER_MICRO_STATE_MATRIX,
  MICRO_PATTERNS_CANONICALISED: SCE_ACTION_DIALOG_MICRO_PATTERNS_CANONICALISED,
  MICRO_PATTERNS_DEFERRED: SCE_ACTION_DIALOG_MICRO_PATTERNS_DEFERRED,
} as const;

export const SCE_DESIGN_SYSTEM_06_REPRESENTATIVE_ADOPTION = {
  ACTIVITY_COMPOSER:
    "SceActivityComposerFooter data-sce-composer-action hierarchy markers — architecture preserved",
  COMMUNICATION: "Communication hub primary/secondary → SceActionLink (canonical Button variants)",
  ADMIN: "UserRowActionsMenu → SceOverflowMenu + SceConfirmDialog destructive confirmations",
  TOURNAMENT_OPERATIONAL: "TurniereTournamentRecordDeleteDialog → SceConfirmDialog",
  TOURNAMENT_CENTER: "TurniereManagementHeaderMenu SceOverflowMenu + SCE surface list panels (DS-06-R1)",
  TOURNAMENT_PLANUNG:
    "Actionable readiness panel + TournamentPlanungSetupDialog — existing HOME planner activation (DS-06-R1)",
  PEOPLE_ACCESS: "TenantUsersSearchableList canonical Button + SCE KPI surfaces (DS-06-R1)",
  OVERFLOW_MENU: "SceOverflowMenu shared trigger/item tokens (UserRowActionsMenu reference)",
  DESTRUCTIVE_CONFIRMATION: "SceConfirmDialog — meaningful copy, danger confirm, safe cancel",
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
} as const;

export const SCE_DESIGN_SYSTEM_06_NESTED_DIALOG_COUNTS = {
  NESTED_DIALOG_PATTERNS_FOUND: SCE_NESTED_DIALOG_INVENTORY.length,
  NESTED_DIALOG_PATTERNS_MIGRATED_DS06: 0,
  NESTED_DIALOG_PATTERNS_DEFERRED: SCE_NESTED_DIALOG_INVENTORY.filter(
    (r) => r.classification === "MIGRATE_LATER",
  ).length,
  NESTED_DIALOG_JUSTIFIED_EXCEPTIONS: SCE_NESTED_DIALOG_INVENTORY.filter(
    (r) => r.classification === "JUSTIFIED_EXCEPTION",
  ).length,
} as const;
