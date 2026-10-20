/**
 * SCE-DESIGN-SYSTEM-05 — forms & controls metadata & audit.
 */
import { SCE_WORKSPACE_PRODUCT_WIDE_FLAGS } from "@/lib/design-system/sce-workspace-hierarchy";
import {
  SCE_BINARY_CHECKBOX_AUDIT_SCOPE,
  SCE_BINARY_CHECKBOX_COUNTS,
} from "@/lib/design-system/sce-binary-checkbox-audit";
import { SCE_FORM_FIELD_LAYERS } from "@/lib/design-system/sce-form-control-foundation";
import {
  SCE_FORM_CONTROL_MICRO_PATTERNS_CANONICALISED,
  SCE_FORM_CONTROL_MICRO_PATTERNS_DEFERRED,
  SCE_FORM_CONTROL_MICRO_STATE_MATRIX,
  SCE_FORM_CONTROL_MICRO_UX_DOC_MARKERS,
  SCE_FORM_CONTROL_MICRO_UX_GOVERNANCE,
} from "@/lib/design-system/sce-form-control-micro-ux";
import { SCE_MICRO_UX_GOVERNANCE } from "@/lib/design-system/sce-micro-ux-governance";

export const SCE_DESIGN_SYSTEM_05_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-05" as const;

export const SCE_DESIGN_SYSTEM_05_PREDECESSOR = "SCE-DESIGN-SYSTEM-04" as const;

export const SCE_DESIGN_SYSTEM_05_CANONICAL_FORM_PRIMITIVES = {
  FORM_FIELD: "SceFormField",
  TEXT_INPUT: "SceTextInput",
  TEXTAREA: "SceTextarea",
  SELECT: "SceToolbarSelect",
  COMBOBOX: "SceListSelectorPanel",
  SEARCH: "SceSearchField",
  DATE: "SceActivityDateInput",
  TIME: "SceActivityTimeInput",
  DATE_TIME: "SceActivityDateTimeInput",
  CHECKBOX: "SceCheckbox",
  SWITCH_TOGGLE: "SwitchToggle",
  RADIO_CHOICE: "SceSegmentedControl",
  SEGMENTED_CONTROL: "SceSegmentedControl",
  VALIDATION_SUMMARY: "ValidationSummary",
  BUTTON: "Button",
} as const;

export const SCE_DESIGN_SYSTEM_05_PO_FLAGS = {
  ...SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
  FORM_CONTROL_SYSTEM_PRODUCT_WIDE: "YES",
  CARD_SYSTEM_PRODUCT_WIDE: "YES",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  ACTIVITY_CARD_FAMILY_CANONICAL: "YES",
  WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE: "PASS",
  VALIDATION_SYSTEM_CANONICAL: "YES",
  DISABLED_READ_ONLY_SEMANTICS_CANONICAL: "YES",
  MANUAL_UAT_BY_CURSOR: "SKIPPED_PO_OWNED",
  SCREENSHOTS_BY_CURSOR: "SKIPPED_PO_OWNED",
} as const;

export const SCE_DESIGN_SYSTEM_05_PO_CLOSURE = {
  PO_FORM_CONTROL_SYSTEM_REVIEW: "PENDING",
  PO_TOGGLE_FIRST_REVIEW: "PENDING",
  PO_VALIDATION_LANGUAGE_REVIEW: "PENDING",
  PO_FORM_CONTROL_MICRO_UX_REVIEW: "PENDING",
  DS05_STATUS: "READY_FOR_PO_REVIEW",
  DS05_R1_MICRO_UX_STATUS: "READY_FOR_PO_REVIEW",
  BASELINE_STAGE_HEAD: "4bc4ad9f81eb243df5bcc68164085cace4b1f011",
  ACCEPTED_IMPLEMENTATION_HEAD: "f311c899822daed639b328f3281bb0b0a3c92e39",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-06",
} as const;

/** DS-05 R1 — world-class micro-UX refinement (same branch, no architecture restart). */
export const SCE_DESIGN_SYSTEM_05_R1_MICRO_UX = {
  ...SCE_FORM_CONTROL_MICRO_UX_GOVERNANCE,
  PACKAGE_KEY: "SCE-DESIGN-SYSTEM-05-R1-MICRO-UX",
  DS05_R1_MICRO_UX_STATUS: "READY_FOR_PO_REVIEW",
  /** Updated by guardrails after each R1 commit — PO review gate. */
  FEATURE_HEAD_FULL: "4b6a3bcb63d0ba1adcf3394aca82adf264c423a8",
} as const;

/**
 * === WORLD_CLASS_MICRO_UX === (DS-05 final report — PO addendum)
 * Manual visual UAT remains PO-owned (`MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED`).
 */
export const SCE_DESIGN_SYSTEM_05_WORLD_CLASS_MICRO_UX = {
  ...SCE_MICRO_UX_GOVERNANCE,
  MICRO_STATE_COVERAGE: "PASS",
  MICRO_ALIGNMENT_CONSISTENCY: "PASS",
  MICRO_RESPONSIVE_QUALITY: "PARTIAL_DS09_FINAL",
  MICRO_ACCESSIBILITY: "PARTIAL_DS09_FINAL",
  CONTROL_MICRO_STATES_AUDITED: SCE_FORM_CONTROL_MICRO_STATE_MATRIX,
  MICRO_PATTERNS_CANONICALISED: SCE_FORM_CONTROL_MICRO_PATTERNS_CANONICALISED,
  MICRO_PATTERNS_DEFERRED: SCE_FORM_CONTROL_MICRO_PATTERNS_DEFERRED,
} as const;

export type SceFormControlAuditClassification =
  | "CANONICAL"
  | "CANONICAL_WITH_REFINEMENT"
  | "MIGRATE_DS05"
  | "MIGRATE_LATER"
  | "DOMAIN_SPECIFIC_CANONICAL"
  | "DUPLICATE"
  | "DEPRECATE";

export type SceFormControlAuditEntry = {
  area: string;
  routes: string;
  classification: SceFormControlAuditClassification;
  canonicalTarget: string;
  notes: string;
};

/** Product-wide form / control audit (DS-05 + DS-10 gate). */
export const SCE_DESIGN_SYSTEM_05_FORM_CONTROL_AUDIT: SceFormControlAuditEntry[] = [
  {
    area: "Dashboard",
    routes: "/dashboard",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "Button + SceFormField for settings dialogs",
    notes: "Personal dashboard customize — token alignment DS-10",
  },
  {
    area: "Mein Programm",
    routes: "/dashboard/mein-programm",
    classification: "CANONICAL",
    canonicalTarget: "Filters + programme search patterns",
    notes: "List filters — adopt SceSearchField where search added",
  },
  {
    area: "Teams",
    routes: "/dashboard/teams/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "SceFormField + SwitchToggle",
    notes: "Registration wizards — mixed legacy checkboxes DS-10",
  },
  {
    area: "Match / Training / Tournament / Club Event",
    routes: "activity modules",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "SceActivityComposer + SceActivityDateTimeInput",
    notes: "Composer architecture preserved; smart date/time canonical",
  },
  {
    area: "Wochenplaner / Planning Hub",
    routes: "/dashboard/planner/*",
    classification: "MIGRATE_DS05",
    canonicalTarget: "PlannerEntryPublicationFields + SwitchThumb",
    notes: "Create form publication migrated DS-05; hub boards DS-10",
  },
  {
    area: "Tournament Planner",
    routes: "tournament planung",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "Operational controls preserved",
    notes: "Visual primitives only — no sporting regression",
  },
  {
    area: "Communication",
    routes: "/dashboard/communication/*",
    classification: "CANONICAL",
    canonicalTarget: "SceFormField + SwitchToggle + SceSearchField",
    notes: "Email sender, preferences, personal signature DS-05 adoption",
  },
  {
    area: "Email Sender",
    routes: "/dashboard/communication/email-sender",
    classification: "CANONICAL",
    canonicalTarget: "SceFormField + SceTextInput",
    notes: "Primary visual reference for calm form hierarchy",
  },
  {
    area: "Personen & Zugänge",
    routes: "/dashboard/admin/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "PersonForm SwitchToggle exemplar",
    notes: "PersonForm already Toggle First — extend SceFormField DS-10",
  },
  {
    area: "Roles / Permissions",
    routes: "administration/roles",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "SwitchToggle + multi-select checkboxes",
    notes: "NavAlignedPermissionEditor already switch-only",
  },
  {
    area: "Facilities / Admin settings",
    routes: "admin modules",
    classification: "MIGRATE_LATER",
    canonicalTarget: "SceFormField + fca-input",
    notes: "Dense admin forms — DS-10 sweep",
  },
  {
    area: "Documents / Workspace lists",
    routes: "workspace file lists",
    classification: "MIGRATE_DS05",
    canonicalTarget: "SceSearchField + SceCheckbox multi-select",
    notes: "Competitions search bar migrated; workspace columns legitimate checkbox",
  },
  {
    area: "Infoboard administration",
    routes: "infoboard designer",
    classification: "MIGRATE_LATER",
    canonicalTarget: "SwitchToggle for binary widget flags",
    notes: "Designer panels — DS-10",
  },
  {
    area: "Sponsor / Commercial (future)",
    routes: "future",
    classification: "MIGRATE_DS05",
    canonicalTarget: "SponsorBannerConfigForm SwitchToggle",
    notes: "CMS config form binary migrated DS-05",
  },
  {
    area: "Activity Composer",
    routes: "/new, SceActivityComposer",
    classification: "CANONICAL",
    canonicalTarget: "SceActivityDateTimeInput + SwitchToggle",
    notes: "Architecture intact — guardrails unchanged",
  },
];

export type SceFormControlInventoryRow = {
  currentComponent: string;
  domainRoutes: string;
  semantics: string;
  classification: SceFormControlAuditClassification;
  canonicalTarget: string;
  ds05Action: string;
  futurePackage?: string;
  status: string;
  justifiedException?: string;
};

export const SCE_DESIGN_SYSTEM_05_LEGACY_FORM_INVENTORY: SceFormControlInventoryRow[] = [
  {
    currentComponent: "PlannerEntryCreateForm publication checkboxes",
    domainRoutes: "/dashboard/planner/create",
    semantics: "BINARY_SETTING",
    classification: "MIGRATE_DS05",
    canonicalTarget: "PlannerEntryCreatePublicationFields",
    ds05Action: "MIGRATED",
    status: "DS05_DONE",
  },
  {
    currentComponent: "Legacy event create forms (Training/Match/…)",
    domainRoutes: "admin/events/*",
    semantics: "BINARY_SETTING mixed",
    classification: "MIGRATE_LATER",
    canonicalTarget: "SwitchToggle",
    ds05Action: "DEFER",
    futurePackage: "DS-10",
    status: "DS10_REMAINING",
  },
  {
    currentComponent: "CampaignComposer checkboxes",
    domainRoutes: "communication/campaigns",
    semantics: "MULTI_SELECTION + channels",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "SceCheckbox + SwitchToggle audit",
    ds05Action: "INVENTORY",
    futurePackage: "DS-10",
    status: "DS10_REMAINING",
  },
  {
    currentComponent: "Raw gray search inputs",
    domainRoutes: "competitions, legacy lists",
    semantics: "SEARCH",
    classification: "MIGRATE_DS05",
    canonicalTarget: "SceSearchField",
    ds05Action: "MIGRATED_COMPETITIONS",
    status: "DS05_PARTIAL",
  },
  {
    currentComponent: "Local FieldLabel in PlannerEntryEditForm",
    domainRoutes: "planner edit",
    semantics: "LABEL",
    classification: "DUPLICATE",
    canonicalTarget: "SceFormField",
    ds05Action: "DEFER",
    futurePackage: "DS-10",
    status: "DS10_REMAINING",
  },
];

export const SCE_DESIGN_SYSTEM_05_DOC_MARKERS = [
  "SCE-DESIGN-SYSTEM-05",
  "FORM_CONTROL_SYSTEM_PRODUCT_WIDE",
  "SceFormField",
  "SceSearchField",
  "SCE_FORM_FIELD_LAYERS",
  "SCE-DESIGN-SYSTEM-05-FORM-CONTROL-INVENTORY",
  "Toggle First",
  "UNVISITED ≠ ERROR",
  ...SCE_FORM_CONTROL_MICRO_UX_DOC_MARKERS,
] as const;

export const SCE_DESIGN_SYSTEM_05_GOVERNANCE = {
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
  FORM_CONTROL_SYSTEM_PRODUCT_WIDE: "YES",
  CANONICAL_PRIMITIVES_USED: Object.values(SCE_DESIGN_SYSTEM_05_CANONICAL_FORM_PRIMITIVES),
  NEW_PRIMITIVES_INTRODUCED: [
    "SceFormField",
    "SceTextInput",
    "SceTextarea",
    "SceSearchField",
    "SceCheckbox",
  ],
  NEW_PRIMITIVES_JUSTIFICATION:
    "Composable form-field shell and thin control wrappers on existing fca-input tokens — no parallel form framework.",
  PARALLEL_PATTERN_INTRODUCED: "NO",
  BINARY_CONTROL_COMPLIANCE: "PASS",
  NEW_BINARY_CHECKBOXES: 0,
  CANONICAL_TOGGLES_USED: "YES",
  MULTI_SELECTION_PATTERN: "SceCheckbox_FOR_LEGITIMATE_MULTI_SELECT",
  VALIDATION_SYSTEM_CANONICAL: "YES",
  DISABLED_READ_ONLY_SEMANTICS_CANONICAL: "YES",
  ACTIVITY_COMPOSER_ARCHITECTURE: "PRESERVED",
  WORKSPACE_SYSTEM_PRODUCT_WIDE: "YES",
  CARD_SYSTEM_PRODUCT_WIDE: "YES",
  WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE: "PASS",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  FORM_FIELD_LAYERS: SCE_FORM_FIELD_LAYERS,
  BINARY_CHECKBOX_AUDIT: SCE_BINARY_CHECKBOX_AUDIT_SCOPE,
  BINARY_CHECKBOX_COUNTS: SCE_BINARY_CHECKBOX_COUNTS,
  RESPONSIVE_COMPLIANCE: "PARTIAL_DS09_FINAL",
  ACCESSIBILITY_COMPLIANCE: "PARTIAL_DS09_FINAL",
  UNEXPLAINED_LEGACY_FORM_FAMILIES_ALLOWED_AT_DS10_CLOSURE: "NO",
  ...SCE_FORM_CONTROL_MICRO_UX_GOVERNANCE,
} as const;

export const SCE_DESIGN_SYSTEM_05_REPRESENTATIVE_ADOPTION = {
  ACTIVITY_COMPOSER: "PRESERVED — existing SwitchToggle + SceActivityDateTimeInput guardrails",
  ADMIN: "NotificationPreferencesSection + LayoutConfigPanel CMS responsive toggles",
  COMMUNICATION:
    "EmailSenderWorkspace SceFormField; CommunicationPreferencesSection SwitchThumb; personal signature toggles",
  PLANNING_OPERATIONAL: "PlannerEntryCreatePublicationFields (Wochenplaner create publication)",
  SEARCH_FILTER: "CompetitionsSearchBar SceSearchField + archived SwitchToggle",
  BINARY_SETTINGS:
    "14 binary-setting checkbox patterns migrated (see SCE_BINARY_CHECKBOX_COUNTS)",
} as const;
