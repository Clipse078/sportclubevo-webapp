/**
 * SCE-DESIGN-SYSTEM-10-R3 — Administration, Documents & Planning Administration batch.
 */
/** Activity card temporal locks — re-exported for R3 governance reports. */
export { SCE_DESIGN_SYSTEM_10_R2_ACTIVITY_CARD_TEMPORAL } from "@/lib/design-system/sce-design-system-10-meta";

export const SCE_DESIGN_SYSTEM_10_R3_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-10-R3" as const;

/** PO visual UAT — Publishing / CMS / Infoboard (accepted baseline for R3). */
export const SCE_DESIGN_SYSTEM_10_R3_PO_PUBLISHING_VISUAL_UAT = {
  PO_DS10_PUBLISHING_VISUAL_UAT: "PASS",
  PO_DS10_CMS_OVERVIEW: "PASS",
  PO_DS10_INFOBOARD_OVERVIEW: "PASS",
  PO_DS10_INFOBOARD_WORKSPACE: "PASS",
  PO_DS10_INFOBOARD_DESIGNER: "PASS",
  PO_DS10_INFOBOARD_DISPLAY_SETTINGS: "PASS",
  PO_DS10_MEDIA_LIBRARY: "PASS",
  PURPOSE_BUILT_INFOBOARD_DESIGNER_PRESERVED: "YES",
  COMMUNICATION_VISUAL_LANGUAGE_CONVERGENCE: "PASS",
  FUNCTIONAL_SURFACE_HIERARCHY: "PASS",
  TOGGLE_FIRST_VISUAL_COMPLIANCE: "PASS",
  CARD_SOUP: "NO",
  CMS_API_SUCCESS_BANNER_VISUAL_WEIGHT: "REVIEW_LATER",
} as const;

export const SCE_DESIGN_SYSTEM_10_R3_BATCH_03 = {
  BATCH: "SCE-DESIGN-SYSTEM-10-R3-BATCH-03",
  TITLE: "Administration, Documents (DAM) & Planning Administration",
  ROUTES: {
    "/dashboard/workspace": "MIGRATED_DS10_R3",
    "/dashboard/workspace/audit": "MIGRATED_DS10_R3",
    "/dashboard/workspace/governance/break-glass": "MIGRATED_DS10_R3",
    "/dashboard/logs": "MIGRATED_DS10_R3",
    "/dashboard/planner/day": "MIGRATED_DS10_R3",
    "/dashboard/planner/new": "MIGRATED_DS10_R3",
    "/dashboard/planner/edit/[eventId]": "MIGRATED_DS10_R3",
    "/dashboard/admin/facilities": "MIGRATED_DS10_R3",
    "/dashboard/seasons/planner": "MIGRATED_DS10_R3",
  },
  PRIMITIVES: [
    "SceWorkspaceChrome",
    "SceBreadcrumbs",
    "SceWorkspaceHeader",
    "SceInformationSurface",
    "SceFeatureCard",
    "SceDenseSurface",
    "SceDataTable",
    "SceEmptyState",
    "PlanningEditorOperationalWorkspace",
    "fca-input / DS-05 field tokens",
    "Button (DS-06)",
  ],
  LEGACY_REMOVED: [
    "PageBreadcrumbs + PageHeader on Documents hub",
    "Light-theme audit log table shell",
    "Planner create form white card soup",
    "Day planner duplicate header without workspace chrome",
    "Facilities admin legacy white form controls",
  ],
} as const;

export const SCE_DESIGN_SYSTEM_10_R3_REMAINING_DEBT = {
  PLANNING_HUB_CALENDAR_DENSITY: "MIGRATE_LATER_DS10",
  LEGACY_SEASON_PLANNER_COMPONENT: "MIGRATE_LATER_DS10",
  CMS_API_SUCCESS_BANNER_VISUAL_WEIGHT: "REVIEW_LATER",
  ORG_UNIT_MEETING_FORMS: "MIGRATE_LATER_DS10",
  WEBSITE_SUB_WORKSPACES_BEYOND_PO_BASELINE: "DOMAIN_SPECIFIC_CANONICAL",
} as const;

export const SCE_DESIGN_SYSTEM_10_R3_GOVERNANCE = {
  ...SCE_DESIGN_SYSTEM_10_R3_PO_PUBLISHING_VISUAL_UAT,
  ...SCE_DESIGN_SYSTEM_10_R3_BATCH_03,
  MULTI_SELECTION_PATTERN: "SceDenseFilterChip + legitimate row/checkbox selection where semantic",
  FEATURE_HEAD_FULL: "cc39356b9adb96fd195ff0be6e9996579ddf1e0d",
} as const;
