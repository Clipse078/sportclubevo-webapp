/**
 * SCE-DESIGN-SYSTEM-08 — tables, lists & dense UI metadata & audit.
 */
import {
  SCE_DENSE_CANONICAL_PRIMITIVES,
  SCE_DENSE_RSC_BOUNDARY_CONTRACT,
  SCE_DENSE_UI_DS07_INTEGRATION,
  SCE_DENSE_UI_SEMANTICS,
  SCE_DENSE_FILTER_TOOLBAR_CONTRACT,
  SCE_DENSE_ROW_ACTION_CONTRACT,
  SCE_DENSE_SELECTION_CONTRACT,
} from "@/lib/design-system/sce-dense-ui-foundation";
import {
  SCE_DENSE_UI_MICRO_UX_DOC_MARKERS,
  SCE_DENSE_UI_MICRO_UX_GOVERNANCE,
} from "@/lib/design-system/sce-dense-ui-micro-ux";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";
import { SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT } from "@/lib/design-system/sce-design-system-07-r1-meta";
import { SCE_WORKSPACE_PRODUCT_WIDE_FLAGS } from "@/lib/design-system/sce-workspace-hierarchy";

export const SCE_DESIGN_SYSTEM_08_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-08" as const;
export const SCE_DESIGN_SYSTEM_08_PREDECESSOR = "SCE-DESIGN-SYSTEM-07" as const;

export const SCE_DESIGN_SYSTEM_08_PO_FLAGS = {
  ...SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
  DENSE_UI_SYSTEM_PRODUCT_WIDE: "YES",
  TABLE_SYSTEM_CANONICAL: "YES",
  LIST_SYSTEM_CANONICAL: "YES",
  DENSE_SURFACE_CANONICAL: "YES",
  ROW_ACTION_SYSTEM_CANONICAL: "YES",
  DENSE_FILTER_TOOLBAR_CANONICAL: "YES",
  ...SCE_DENSE_UI_SEMANTICS,
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
  STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE: "YES",
  FORM_CONTROL_SYSTEM_PRODUCT_WIDE: "YES",
  ACTION_SYSTEM_PRODUCT_WIDE: "YES",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  MANUAL_UAT_BY_CURSOR: "SKIPPED_PO_OWNED",
  SCREENSHOTS_BY_CURSOR: "SKIPPED_PO_OWNED",
} as const;

export const SCE_DESIGN_SYSTEM_08_PO_REVIEW = {
  DS08_STATUS: "CLOSED / ACCEPTED / MERGED",
  DS08_R1_STATUS: "CLOSED / ACCEPTED / MERGED",
  BASELINE_STAGE_HEAD: "867d6c4a443d33ee219a65d71c755fd78e352bbc",
  BRANCH: "cursor/sce-design-system-08-tables-lists-dense-ui",
  PREDECESSOR_DS07_PR: "885",
  PR: "886",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-09 — Responsive & Accessibility Hardening",
} as const;

export const SCE_DESIGN_SYSTEM_08_PO_CLOSURE = {
  PO_DS08_VISUAL_UAT: "PASS",
  PO_DS08_R1_RUNTIME_REVIEW: "PASS",
  PO_PEOPLE_ACCESS_DESKTOP_REVIEW: "PASS",
  PO_PEOPLE_ACCESS_RESPONSIVE_REVIEW: "PASS",
  PO_ROLES_DENSE_TABLE_REVIEW: "PASS",
  DS08_STATUS: "CLOSED / ACCEPTED / MERGED",
  DS08_R1_STATUS: "CLOSED / ACCEPTED / MERGED",
  PR: "886",
  ACCEPTED_BASE_IMPLEMENTATION_HEAD: "280e287ff5e80cd1e987dbb5af6a9c42567b38f9",
  ACCEPTED_R1_HEAD: "d164cafd8b2fc9cb8184d7d499d8201ef2b4c783",
  FEATURE_HEAD_BEFORE_CLOSURE: "d164cafd8b2fc9cb8184d7d499d8201ef2b4c783",
  /** Set on closure commit — merge SHA recorded on STAGE after PR merge. */
  CLOSURE_COMMIT: "bf3cae19f236fe940a0344c8c3f8738c31e33082",
  STAGE_MERGE_COMMIT: "PENDING_STAGE_MERGE",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-09 — Responsive & Accessibility Hardening",
} as const;

/** Explicit DS-09 handoff — DS-08 does not claim responsive/a11y finality product-wide. */
export const SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT = [
  "horizontal overflow review",
  "responsive table strategy",
  "mobile metadata stacking",
  "breakpoint quality",
  "narrow desktop/tablet behaviour",
  "touch targets",
  "keyboard navigation",
  "focus visibility",
  "semantic structure",
  "screen-reader semantics",
  "reduced motion",
  "zoom/reflow",
  "text truncation/wrapping",
  "long labels/content",
  "dense controls on touch devices",
  "bottom navigation/content collision",
  "sticky/fixed UI collision",
  "modal/dialog responsive behaviour",
  "workspace/header/context-tab responsiveness",
  "activity cards",
  "forms",
  "feedback states",
  "dense UI",
] as const;

export const SCE_DESIGN_SYSTEM_08_DS09_HANDOFF = {
  RESPONSIVE_FINAL_HARDENING: "DS09",
  ACCESSIBILITY_FINAL_HARDENING: "DS09",
  PRODUCT_WIDE_RESPONSIVE_AUDIT_REQUIRED: "YES",
  PRODUCT_WIDE_ACCESSIBILITY_AUDIT_REQUIRED: "YES",
  DEBT: SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT,
} as const;

export type SceDenseUiAuditClassification =
  | "CANONICAL"
  | "CANONICAL_WITH_REFINEMENT"
  | "MIGRATE_DS08"
  | "MIGRATE_LATER_DS10"
  | "DOMAIN_SPECIFIC_CANONICAL"
  | "DUPLICATE"
  | "LEGACY_REPLACE";

export type SceDenseUiAuditEntry = {
  area: string;
  routes: string;
  classification: SceDenseUiAuditClassification;
  pattern: string;
  canonicalTarget: string;
  notes: string;
};

export const SCE_DESIGN_SYSTEM_08_DENSE_UI_AUDIT: SceDenseUiAuditEntry[] = [
  {
    area: "Personen & Zugänge",
    routes: "/dashboard/admin/people-access",
    classification: "MIGRATE_DS08",
    pattern: "DENSE_LIST / RESPONSIVE_DATA_VIEW",
    canonicalTarget: "SceDenseSurface + SceDenseGridRow + SceEntityIdentity",
    notes: "Primary DS-08 adoption — admin entity list with filters",
  },
  {
    area: "Roles overview",
    routes: "/dashboard/administration/roles",
    classification: "MIGRATE_DS08",
    pattern: "TABLE",
    canonicalTarget: "SceDenseSurface + SceDataTable",
    notes: "Second adoption — semantic tabular roles matrix",
  },
  {
    area: "Facilities admin",
    routes: "/dashboard/admin/facilities",
    classification: "MIGRATE_LATER_DS10",
    pattern: "ENTITY_LIST + local menus",
    canonicalTarget: "SceDenseList + SceOverflowMenu",
    notes: "Hierarchical facility/resource tree — domain-specific expand/collapse",
  },
  {
    area: "Planning Hub Liste",
    routes: "/dashboard/planning-hub",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    pattern: "DENSE_LIST",
    canonicalTarget: "PlanningHubListeView row system",
    notes: "Operational planning density — DS-10 alignment with SceDenseGrid patterns",
  },
  {
    area: "Tournament Center / Planner",
    routes: "tournament modules",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    pattern: "TABLE + fixture grids",
    canonicalTarget: "SceTournamentFixturePresentation",
    notes: "Preserve tournament operational patterns per DS-01-R1",
  },
  {
    area: "Communication recipients",
    routes: "/dashboard/communication/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    pattern: "LIST",
    canonicalTarget: "SceRecipientSelector / inbox lists",
    notes: "Positive visual reference — do not copy layout into admin",
  },
  {
    area: "Billing operations tables",
    routes: "/dashboard/admin/commercial/billing/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    pattern: "TABLE",
    canonicalTarget: "SceDataTable via BillingDataTable bridge",
    notes: "DS-08 bridge — shared table chrome",
  },
  {
    area: "Teams / squad lists",
    routes: "/dashboard/teams/*",
    classification: "MIGRATE_LATER_DS10",
    pattern: "LIST",
    canonicalTarget: "SceDenseList + SceEntityIdentity",
    notes: "Legacy EmptyState + local rows",
  },
  {
    area: "Documents / Publishing",
    routes: "documents, publishing",
    classification: "MIGRATE_LATER_DS10",
    pattern: "LIST / TABLE mix",
    canonicalTarget: "SceDenseSurface",
    notes: "Inventory for DS-10",
  },
  {
    area: "Infoboard administration",
    routes: "infoboard admin",
    classification: "MIGRATE_LATER_DS10",
    pattern: "LIST",
    canonicalTarget: "SceDenseList",
    notes: "DS-10",
  },
  {
    area: "Platform admin users",
    routes: "/dashboard/users",
    classification: "DUPLICATE",
    pattern: "TABLE",
    canonicalTarget: "Align with People & Access dense language DS-10",
    notes: "Parallel admin table styling",
  },
  {
    area: "Wochenplaner",
    routes: "week planner",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    pattern: "RESPONSIVE_DATA_VIEW",
    canonicalTarget: "Planner grid density",
    notes: "DS-09 responsive hardening",
  },
  {
    area: "Match squad surfaces",
    routes: "match modules",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    pattern: "ENTITY_LIST",
    canonicalTarget: "Squad selection lists",
    notes: "Sporting domain — DS-10 inventory only",
  },
  {
    area: "SceTeamList (club selector)",
    routes: "composer / selectors",
    classification: "LEGACY_REPLACE",
    pattern: "LIST (card-like rows)",
    canonicalTarget: "SceDenseListRow interactive",
    notes: "Lightweight bridge candidate — card borders reduced in DS-10",
  },
];

export type SceDenseUiInventoryRow = {
  id: string;
  surface: string;
  domainRoutes: string;
  pattern: string;
  classification: SceDenseUiAuditClassification;
  canonicalTarget: string;
  ds08Action: "ADOPTED" | "BRIDGE" | "INVENTORY" | "DEFER";
  futurePackage: "DS-09" | "DS-10" | "NONE";
  status: "ADOPTED" | "BRIDGE" | "REMAINING";
};

export const SCE_DESIGN_SYSTEM_08_DENSE_UI_INVENTORY: SceDenseUiInventoryRow[] =
  SCE_DESIGN_SYSTEM_08_DENSE_UI_AUDIT.map((row, index) => {
    const adopted =
      row.area === "Personen & Zugänge" ||
      row.area === "Roles overview" ||
      row.area === "Billing operations tables";
    const action: SceDenseUiInventoryRow["ds08Action"] = adopted
      ? row.area === "Billing operations tables"
        ? "BRIDGE"
        : "ADOPTED"
      : row.classification === "MIGRATE_LATER_DS10" ||
          row.classification === "LEGACY_REPLACE" ||
          row.classification === "DUPLICATE"
        ? "DEFER"
        : "INVENTORY";
    return {
      id: `DS08-DENSE-${String(index + 1).padStart(3, "0")}`,
      surface: row.area,
      domainRoutes: row.routes,
      pattern: row.pattern,
      classification: row.classification,
      canonicalTarget: row.canonicalTarget,
      ds08Action: action,
      futurePackage:
        action === "ADOPTED" || action === "BRIDGE"
          ? "NONE"
          : row.area === "Wochenplaner"
            ? "DS-09"
            : "DS-10",
      status:
        action === "ADOPTED" ? "ADOPTED" : action === "BRIDGE" ? "BRIDGE" : "REMAINING",
    };
  });

export const SCE_DESIGN_SYSTEM_08_DOC_MARKERS = [
  "SCE-DESIGN-SYSTEM-08",
  "DENSE_UI_SYSTEM_PRODUCT_WIDE",
  "TABLE_SYSTEM_CANONICAL",
  "LIST_SYSTEM_CANONICAL",
  "DENSE_SURFACE_CANONICAL",
  "ROW_ACTION_SYSTEM_CANONICAL",
  "DENSE_FILTER_TOOLBAR_CANONICAL",
  "SceDenseSurface",
  "SceDataTable",
  "SceDenseGridRow",
  "SceEntityIdentity",
  "SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY",
  "SCE-DESIGN-SYSTEM-08-DS09-HANDOFF",
  "SCE_DESIGN_SYSTEM_08_CLOSED_ACCEPTED_MERGED",
  ...SCE_DENSE_UI_MICRO_UX_DOC_MARKERS,
] as const;

export const SCE_DESIGN_SYSTEM_08_GOVERNANCE = {
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
  ...SCE_DENSE_UI_SEMANTICS,
  DENSE_UI_SYSTEM_PRODUCT_WIDE: "YES",
  TABLE_SYSTEM_CANONICAL: "YES",
  LIST_SYSTEM_CANONICAL: "YES",
  DENSE_SURFACE_CANONICAL: "YES",
  ROW_ACTION_SYSTEM_CANONICAL: "YES",
  DENSE_FILTER_TOOLBAR_CANONICAL: "YES",
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
  FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED: "YES",
  DS10_FINAL_DENSE_MIGRATION_REQUIRED: "YES",
  DS10_FINAL_ADOPTION_REQUIRED: "YES",
  PRODUCT_WIDE_DENSE_UI_MIGRATION_COMPLETE: "NO",
  LOCAL_PARALLEL_DENSE_UI_SYSTEMS_ALLOWED: "NO",
  ...SCE_DENSE_RSC_BOUNDARY_CONTRACT,
  ...SCE_DESIGN_SYSTEM_08_DS09_HANDOFF,
  DS07_HANDOFF_DEBT_ADDRESSED: "REPRESENTATIVE — People & Access + Roles + Billing bridge",
  DS07_HANDOFF_DEBT: SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT,
  NEW_BINARY_CHECKBOXES: 0,
  BINARY_CONTROL_COMPLIANCE: "PASS",
  CANONICAL_TOGGLES_USED: "YES",
  MULTI_SELECTION_PATTERN: "ROW_SELECTION_CHECKBOX_ALLOWED = YES_WHEN_MULTI_SELECTION",
  SELECTION: SCE_DENSE_SELECTION_CONTRACT,
  FILTER_TOOLBAR: SCE_DENSE_FILTER_TOOLBAR_CONTRACT,
  ROW_ACTIONS: SCE_DENSE_ROW_ACTION_CONTRACT,
  DS07_STATE_INTEGRATION: SCE_DENSE_UI_DS07_INTEGRATION,
  RESPONSIVE_COMPLIANCE: "PARTIAL_DS09_FINAL",
  ACCESSIBILITY_COMPLIANCE: "PARTIAL_DS09_FINAL",
  ...SCE_DENSE_UI_MICRO_UX_GOVERNANCE,
  BINARY_CHECKBOX_DEFERRED: SCE_BINARY_CHECKBOX_COUNTS.BINARY_SETTING_CHECKBOXES_DEFERRED,
} as const;

export const SCE_DESIGN_SYSTEM_08_REPRESENTATIVE_ADOPTION = {
  PEOPLE_ACCESS_DENSE_UI: "ACCEPTED",
  ROLES_OVERVIEW_DENSE_UI: "ACCEPTED",
  BILLING_TABLE_BRIDGE: "ACCEPTED",
  PEOPLE_ACCESS:
    "TenantUsersSearchableList → SceDenseSurface, SceDenseGridRow, SceEntityIdentity, SceSearchField toolbar",
  ROLES_OVERVIEW:
    "TenantRolesOverviewDenseTable → SceDenseSurface + SceDataTable + SceDenseList mobile",
  BILLING_TABLE_BRIDGE_DETAIL: "BillingDataTable → delegates to SceDataTable primitives",
  SECOND_ADOPTION_RATIONALE:
    "Roles overview is structurally tabular (column relationships) vs People & Access entity grid — proves TABLE vs DENSE_LIST flexibility",
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
} as const;

export const SCE_DESIGN_SYSTEM_08_CANONICAL_DENSE_PRIMITIVES = SCE_DENSE_CANONICAL_PRIMITIVES;
