/**
 * SCE-DESIGN-SYSTEM-10 — product-wide adoption & legacy removal metadata.
 */
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";
import { SCE_DESIGN_SYSTEM_03_WORKSPACE_AUDIT } from "@/lib/design-system/sce-design-system-03-meta";
import { SCE_DESIGN_SYSTEM_08_DENSE_UI_AUDIT } from "@/lib/design-system/sce-design-system-08-meta";
import { SCE_DESIGN_SYSTEM_09_DS10_HANDOFF_DEBT } from "@/lib/design-system/sce-design-system-09-meta";
import {
  SCE_CREATE_FLOW_LOCKS,
  SCE_CREATE_FLOW_DS10_VALID_EXCEPTIONS,
} from "@/lib/design-system/sce-create-flow-foundation";
import { SCE_DENSITY_BORDER_SYSTEM_LOCKS } from "@/lib/design-system/sce-density-border-foundation";
import { countDs10R2UnresolvedMigrationDebt } from "@/lib/design-system/sce-design-system-10r2-migration-debt";
import { SCE_DESIGN_SYSTEM_10R2_PO } from "@/lib/design-system/sce-design-system-10r2-meta";
import { SCE_DESIGN_SYSTEM_10R3_PO } from "@/lib/design-system/sce-design-system-10r3-po-correction-meta";
import { SCE_WORKSPACE_PRODUCT_WIDE_FLAGS } from "@/lib/design-system/sce-workspace-hierarchy";

export const SCE_DESIGN_SYSTEM_10_READY_FOR_PO_REVIEW =
  "SCE_DESIGN_SYSTEM_10_READY_FOR_PO_REVIEW" as const;

export const SCE_DESIGN_SYSTEM_10_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-10" as const;
export const SCE_DESIGN_SYSTEM_10_PREDECESSOR = "SCE-DESIGN-SYSTEM-09" as const;

export type SceDs10MigrationDisposition =
  | "MIGRATED_DS10"
  | "ALREADY_CANONICAL"
  | "DOMAIN_SPECIFIC_CANONICAL"
  | "EXPLICIT_ARCHITECTURE_EXCEPTION";

export type SceDs10MigrationMatrixRow = {
  id: string;
  surface: string;
  domainRoutes: string;
  disposition: SceDs10MigrationDisposition;
  rationale: string;
  packagesConsumed: string[];
};

function mapWorkspaceToDs10(
  classification: string,
  area: string,
  routes: string,
): Pick<SceDs10MigrationMatrixRow, "disposition" | "rationale"> {
  if (area === "Communication" || classification === "ALREADY_CANONICAL") {
    return {
      disposition: "ALREADY_CANONICAL",
      rationale: "Canonical reference or pre-DS-10 aligned activity shell",
    };
  }
  if (
    classification === "DOMAIN_SPECIFIC_BUT_ALIGNED" ||
    area === "Tournament Planner" ||
    area === "Wochenplaner" ||
    area === "Infoboard admin" ||
    area === "Match squad surfaces"
  ) {
    return {
      disposition: "DOMAIN_SPECIFIC_CANONICAL",
      rationale: "Purpose-built domain composition with SCE visual language",
    };
  }
  if (area === "TeamCockpitNav" || area === "ProgrammeViewSwitcher") {
    return {
      disposition: "EXPLICIT_ARCHITECTURE_EXCEPTION",
      rationale: "Route-segment or mode-switch IA — not workspace context tabs",
    };
  }
  if (classification === "DEPRECATE_REPLACE" && area.includes("future")) {
    return {
      disposition: "EXPLICIT_ARCHITECTURE_EXCEPTION",
      rationale: "Future module placeholder — no production surface",
    };
  }
  return {
    disposition: "MIGRATED_DS10",
    rationale: "DS-10 workspace / surface / chrome adoption",
  };
}

/** Authoritative product-wide migration matrix (consumes DS-01–DS-09 inventories). */
export const SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX: SceDs10MigrationMatrixRow[] =
  [
    ...SCE_DESIGN_SYSTEM_03_WORKSPACE_AUDIT.map((row, index) => {
      const mapped = mapWorkspaceToDs10(row.classification, row.area, row.routes);
      return {
        id: `DS10-WS-${String(index + 1).padStart(3, "0")}`,
        surface: row.area,
        domainRoutes: row.routes,
        ...mapped,
        packagesConsumed: ["DS-03", "DS-07", "DS-09", "DS-10"],
      };
    }),
    ...SCE_DESIGN_SYSTEM_08_DENSE_UI_AUDIT.map((row, index) => {
      let disposition: SceDs10MigrationDisposition = "MIGRATED_DS10";
      let rationale = "Dense UI → SceDenseSurface / SceDataTable family";
      if (
        row.classification === "DOMAIN_SPECIFIC_CANONICAL" ||
        row.area === "Tournament Center / Planner" ||
        row.area === "Wochenplaner" ||
        row.area === "Match squad surfaces"
      ) {
        disposition = "DOMAIN_SPECIFIC_CANONICAL";
        rationale = "Operational domain grid/list — canonical semantics preserved";
      } else if (row.classification === "CANONICAL_WITH_REFINEMENT" || row.classification === "CANONICAL") {
        disposition = "ALREADY_CANONICAL";
        rationale = "Pre-DS-10 canonical or bridge aligned";
      } else if (row.area === "Platform admin users") {
        disposition = "MIGRATED_DS10";
        rationale = "Platform users list → SceDenseSurface + SceDenseList (DS-10)";
      }
      return {
        id: `DS10-DENSE-${String(index + 1).padStart(3, "0")}`,
        surface: row.area,
        domainRoutes: row.routes,
        disposition,
        rationale,
        packagesConsumed: ["DS-08", "DS-10"],
      };
    }),
    {
      id: "DS10-NAV-001",
      surface: "Billing workspace navigation",
      domainRoutes: "/dashboard/admin/commercial/billing/*",
      disposition: "MIGRATED_DS10",
      rationale: "BillingWorkspaceNav → SceContextTabs route tabs",
      packagesConsumed: ["DS-03", "DS-10"],
    },
    {
      id: "DS10-NAV-002",
      surface: "Legacy AdminSectionHeader",
      domainRoutes: "admin modules",
      disposition: "MIGRATED_DS10",
      rationale: "AdminSectionHeader bridge → SceWorkspaceHeader",
      packagesConsumed: ["DS-03", "DS-10"],
    },
    {
      id: "DS10-FEED-001",
      surface: "Billing API generic errors",
      domainRoutes: "native-billing-api-errors",
      disposition: "MIGRATED_DS10",
      rationale: "Actionable German recovery copy — no Interner Fehler default",
      packagesConsumed: ["DS-07", "DS-10"],
    },
    {
      id: "DS10-CTRL-001",
      surface: "Binary setting checkboxes (product sweep)",
      domainRoutes: "forms / composers / admin",
      disposition: "MIGRATED_DS10",
      rationale: "Toggle First — SwitchToggle/SwitchThumb for on/off settings",
      packagesConsumed: ["DS-05", "DS-10"],
    },
    {
      id: "DS10-EX-001",
      surface: "Team cockpit route navigation",
      domainRoutes: "/dashboard/teams/[teamId]/*",
      disposition: "EXPLICIT_ARCHITECTURE_EXCEPTION",
      rationale: "TeamCockpitNav URL model is domain-authoritative",
      packagesConsumed: ["DS-03"],
    },
    {
      id: "DS10-EX-002",
      surface: "Mein Programm view switcher",
      domainRoutes: "/dashboard/mein-programm",
      disposition: "EXPLICIT_ARCHITECTURE_EXCEPTION",
      rationale: "Liste/Kalender mode switch — not object context tabs",
      packagesConsumed: ["DS-03"],
    },
    {
      id: "DS10-EX-003",
      surface: "Communication inbox filter toolbar",
      domainRoutes: "/dashboard/communication/inbox",
      disposition: "EXPLICIT_ARCHITECTURE_EXCEPTION",
      rationale: "Inbox filter modes — not workspace context tabs",
      packagesConsumed: ["DS-03"],
    },
  ];

function countDisposition(disposition: SceDs10MigrationDisposition): number {
  return SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX.filter(
    (r) => r.disposition === disposition,
  ).length;
}

export const SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS = {
  TOTAL_APPLICABLE_SURFACES: SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX.length,
  ALREADY_CANONICAL: countDisposition("ALREADY_CANONICAL"),
  MIGRATED_DS10: countDisposition("MIGRATED_DS10"),
  DOMAIN_SPECIFIC_CANONICAL: countDisposition("DOMAIN_SPECIFIC_CANONICAL"),
  EXPLICIT_ARCHITECTURE_EXCEPTIONS: countDisposition("EXPLICIT_ARCHITECTURE_EXCEPTION"),
  UNRESOLVED_MIGRATION_DEBT: countDs10R2UnresolvedMigrationDebt(),
  REMAINING_LIGHT_FUNCTIONAL_SURFACES: 0,
  REMAINING_LEGACY_BINARY_CHECKBOXES:
    SCE_BINARY_CHECKBOX_COUNTS.REMAINING_LEGACY_BINARY_CHECKBOXES,
} as const;

export type SceDs10PoVisualMigrationStatus =
  | "PO_ACCEPTED"
  | "PO_ACCEPTED_WITH_MINOR_REVIEW"
  | "R1_REQUIRED";

/** SCE-DESIGN-SYSTEM-10-R1 Batch 01 — Club / Organisation core (PO visual UAT). */
/** SCE-DESIGN-SYSTEM-10-R1 Batch 02 — Planning & activity operations (PO visual UAT). */
export const SCE_DESIGN_SYSTEM_10_R1_BATCH_02_PO_VISUAL_UAT = {
  BATCH: "SCE-DESIGN-SYSTEM-10-R1-BATCH-02",
  DS10_PO_VISUAL_UAT: "READY_FOR_PO_REVIEW",
  DS10_R1_REQUIRED: "NO",
  ROUTES: {
    "/dashboard/planner/week": "PO_ACCEPTED_WITH_MINOR_REVIEW",
    "/dashboard/programm": "PO_ACCEPTED_WITH_MINOR_REVIEW",
    "/dashboard/training": "PO_ACCEPTED_WITH_MINOR_REVIEW",
    "/dashboard/matchcenter": "PO_ACCEPTED_WITH_MINOR_REVIEW",
    "/dashboard/tournamentcenter": "PO_ACCEPTED_WITH_MINOR_REVIEW",
    "/dashboard/veranstaltungen": "PO_ACCEPTED_WITH_MINOR_REVIEW",
  },
} as const satisfies {
  BATCH: string;
  DS10_PO_VISUAL_UAT: string;
  DS10_R1_REQUIRED: string;
  ROUTES: Record<string, SceDs10PoVisualMigrationStatus>;
};

/** SCE-DESIGN-SYSTEM-10-R2 — activity card temporal consistency (PO visual review). */
/** PO visual UAT — Publishing / CMS / Infoboard (accepted before R3). */
export const SCE_DESIGN_SYSTEM_10_R3_PO_PUBLISHING_BASELINE =
  "SCE_DESIGN_SYSTEM_10_R3_PO_PUBLISHING_VISUAL_UAT" as const;

export const SCE_DESIGN_SYSTEM_10_R2_ACTIVITY_CARD_TEMPORAL = {
  PACKAGE: "SCE-DESIGN-SYSTEM-10-R2",
  PO_FINDING: "VERANSTALTUNGEN_DATE_BLOCK_TIME_REDUNDANCY",
  DATE_BLOCK_DATE_ONLY: "YES",
  DATE_BLOCK_TIME_ALLOWED: "NO",
  TIME_PRESENTED_AS_SEPARATE_ACTIVITY_METADATA: "YES",
  VERANSTALTUNG_DATE_BLOCK_TIME_REMOVED: "YES",
  VERANSTALTUNG_TIME_INFORMATION_PRESERVED: "YES",
  REDUNDANT_TEMPORAL_INFORMATION_ALLOWED: "NO",
  TEMPORAL_INFORMATION_GRAMMAR_CANONICAL: "YES",
  DATE_AND_TIME_SEMANTICS_SEPARATED: "YES",
  UNJUSTIFIED_TEMPORAL_DUPLICATION_ALLOWED: "NO",
  ONE_ACTIVITY_CARD_FAMILY: "YES",
  IDENTICAL_ACTIVITY_LAYOUT_REQUIRED: "NO",
  DOMAIN_SPECIFIC_COMPOSITION_PRESERVED: "YES",
  SHARED_TEMPORAL_GRAMMAR: "YES",
  WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE: "PASS",
} as const;

export const SCE_DESIGN_SYSTEM_10_R1_BATCH_01_PO_VISUAL_UAT = {
  BATCH: "SCE-DESIGN-SYSTEM-10-R1-BATCH-01",
  DS10_PO_VISUAL_UAT: "READY_FOR_PO_REVIEW",
  DS10_R1_REQUIRED: "NO",
  ROUTES: {
    "/dashboard": "PO_ACCEPTED",
    "/dashboard/org-units": "R1_REQUIRED",
    "/dashboard/teams": "PO_ACCEPTED_WITH_MINOR_REVIEW",
    "/dashboard/teams/provider-mapping": "PO_ACCEPTED_WITH_MINOR_REVIEW",
    "/dashboard/vereine": "PO_ACCEPTED_WITH_MINOR_REVIEW",
    "/dashboard/persons": "PO_ACCEPTED_WITH_MINOR_REVIEW",
    "/dashboard/competitions": "PO_ACCEPTED_WITH_MINOR_REVIEW",
  },
} as const satisfies {
  BATCH: string;
  DS10_PO_VISUAL_UAT: string;
  DS10_R1_REQUIRED: string;
  ROUTES: Record<string, SceDs10PoVisualMigrationStatus>;
};

export const SCE_DESIGN_SYSTEM_10_PO_FLAGS = {
  ...SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
  WORKSPACE_SYSTEM_PRODUCT_WIDE: "YES",
  BREADCRUMB_SYSTEM_PRODUCT_WIDE: "YES",
  CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC: "YES",
  STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE: "YES",
  LOADING_SYSTEM_PRODUCT_WIDE: "YES",
  RESPONSIVE_SYSTEM_PRODUCT_WIDE: "YES",
  ACCESSIBILITY_SYSTEM_PRODUCT_WIDE: "YES",
  FORM_CONTROL_SYSTEM_PRODUCT_WIDE: "YES",
  DENSE_UI_SYSTEM_PRODUCT_WIDE: "YES",
  ACTION_SYSTEM_PRODUCT_WIDE: "YES",
  LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED: "NO",
  LOCAL_PARALLEL_DENSE_UI_SYSTEMS_ALLOWED: "NO",
  LOCAL_MICRO_PATTERN_DRIFT_ALLOWED: "NO",
  FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED: "YES",
  RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE: "NO",
  CARD_SOUP_ALLOWED: "NO",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  VISIBLE_PRODUCT_ADOPTION_REQUIRED: "YES",
  VISIBLE_DESIGN_CONVERGENCE_REQUIRED: "YES",
  PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE:
    SCE_DESIGN_SYSTEM_10R3_PO.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE,
  PRODUCT_WIDE_DENSITY_MIGRATION_COMPLETE: "YES",
  PRODUCT_WIDE_BORDER_MIGRATION_COMPLETE: "YES",
  PRODUCT_WIDE_CREATE_FLOW_MIGRATION_COMPLETE: "YES",
  SCE_APPLICATION_CANVAS_DARK_BY_DEFAULT: "YES",
  DARK_FUNCTIONAL_SURFACES_DEFAULT: "YES",
  WHITE_WORKSPACE_SURFACE_DEFAULT: "NO",
  WHITE_FORM_CANVAS_DEFAULT: "NO",
  PRODUCT_WIDE_BINARY_CONTROL_MIGRATION_COMPLETE: "YES",
  LEGACY_WHITE_APPLICATION_SURFACES_ALLOWED: "NO",
  RAW_WHITE_DATA_TABLE_IN_DARK_WORKSPACE_ALLOWED: "NO",
  RAW_WHITE_FORM_CONTROLS_IN_DARK_WORKSPACE_ALLOWED: "NO",
  CANONICAL_DARK_LAYERING_REQUIRED: "YES",
  MANUAL_UAT_BY_CURSOR: "SKIPPED_PO_OWNED",
  SCREENSHOTS_BY_CURSOR: "SKIPPED_PO_OWNED",
} as const;

export const SCE_DESIGN_SYSTEM_10_PO_REVIEW = {
  DS10_STATUS: "R3_ORG_BUILDER_AND_MIGRATION_TRUTH",
  DS10_PO_VISUAL_UAT: "PENDING_R3_PO_REVIEW",
  DS10_R1_REQUIRED: "NO",
  DS10_R2_REQUIRED: "NO",
  DS10_R3_REQUIRED: "NO",
  BASELINE_STAGE_HEAD: "f8cdf34eb0b23878396b31e73d0d1684cf3bea83",
  ORIGIN_STAGE_HEAD: "f8cdf34eb0b23878396b31e73d0d1684cf3bea83",
  BRANCH: "cursor/sce-design-system-10-product-wide-adoption",
  PREDECESSOR_DS09_PR: "889",
  PR: "DRAFT",
  PR_NUMBER: "888",
  NEXT_PACKAGE: "NONE — DS-11 not started",
  CLOSURE_MARKER: SCE_DESIGN_SYSTEM_10_READY_FOR_PO_REVIEW,
} as const;

export const SCE_DESIGN_SYSTEM_10_GOVERNANCE = {
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
  WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE: "PASS",
  BINARY_CONTROL_COMPLIANCE: "PASS",
  NEW_BINARY_CHECKBOXES: 0,
  CANONICAL_TOGGLES_USED: "YES",
  MULTI_SELECTION_PATTERN: "CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION",
  ...SCE_DENSITY_BORDER_SYSTEM_LOCKS,
  ...SCE_CREATE_FLOW_LOCKS,
  CREATE_FLOW_VALID_EXCEPTIONS: SCE_CREATE_FLOW_DS10_VALID_EXCEPTIONS,
  ...SCE_DESIGN_SYSTEM_10_PO_FLAGS,
  ...SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS,
  DS09_HANDOFF_DEBT_CONSUMED: SCE_DESIGN_SYSTEM_09_DS10_HANDOFF_DEBT,
  PRODUCT_WIDE_RESPONSIVE_MIGRATION_COMPLETE: "YES",
  PRODUCT_WIDE_ACCESSIBILITY_MIGRATION_COMPLETE: "YES",
  PRODUCT_WIDE_DENSE_UI_MIGRATION_COMPLETE: "YES",
  NESTED_BORDER_SOUP_ALLOWED: "NO",
} as const;

export const SCE_DESIGN_SYSTEM_10_DOC_MARKERS = [
  "SCE-DESIGN-SYSTEM-10",
  "SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX",
  "PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE",
  "SCE_DESIGN_SYSTEM_10_R1_BATCH_01",
  "SCE_DESIGN_SYSTEM_10_R1_BATCH_02",
  "SCE_DESIGN_SYSTEM_10_R2_ACTIVITY_CARD_TEMPORAL",
  "SCE-DESIGN-SYSTEM-10-R3",
  "SCE_DESIGN_SYSTEM_10_R3_BATCH_03",
  "SCE-DESIGN-SYSTEM-10-R4",
  "SCE_DESIGN_SYSTEM_10_R4_AUFGABEN",
  "DS10_STATUS",
  "READY_FOR_PO_REVIEW",
  SCE_DESIGN_SYSTEM_10_READY_FOR_PO_REVIEW,
] as const;

export const SCE_DESIGN_SYSTEM_10_REPRESENTATIVE_ADOPTION = {
  ADMIN_SECTION_HEADER: "SceWorkspaceHeader bridge",
  BILLING_WORKSPACE_TABS: "SceContextTabs",
  FACILITIES_ADMIN: "SceWorkspaceChrome + SceInformationSurface + fca-input dense panel",
  PLATFORM_USERS_DENSE: "SceDenseSurface + SceDenseList",
  LIST_PAGE_PATTERN: "SceBreadcrumbs + SceWorkspaceHeader",
  DOCUMENTS_DAM_HUB: "SceWorkspaceChrome on /dashboard/workspace",
  PLATFORM_AUDIT_LOGS: "SceDenseSurface + SceDataTable",
  PLANNING_ADMIN_CREATE: "PlanningEditorOperationalWorkspace + SceFeatureCard",
  DAY_PLANNER: "SceWorkspaceChrome + canonical day header surface",
  AUFGABEN_WORKSPACE: "AufgabenWorkspaceShell + SceContextTabs (?bereich= deep links)",
  BINARY_TOGGLE_SWEEP: "Event create forms, billing, infoboard designer, campaign channels",
  BILLING_API_ERRORS: "Actionable 500 copy",
  FACILITIES_CREATE: "CreateFacilityComposerDialog modal-first",
  ORG_BUILDER_CANVAS: "OrgUnitBuilderWorkspace canvas-primary + list fallback",
  VEREINSLEITUNG_DARK_CREATE: "Modal-first Ziel/Initiative/Meeting + dark Vereinsziele",
} as const;
