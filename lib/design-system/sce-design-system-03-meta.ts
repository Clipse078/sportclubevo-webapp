/**
 * SCE-DESIGN-SYSTEM-03 — workspace / surface / navigation metadata & audit.
 */
import { SCE_WORKSPACE_PRODUCT_WIDE_FLAGS } from "@/lib/design-system/sce-workspace-hierarchy";

export const SCE_DESIGN_SYSTEM_03_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-03" as const;

export const SCE_DESIGN_SYSTEM_03_PREDECESSOR = "SCE-DESIGN-SYSTEM-02" as const;

export const SCE_DESIGN_SYSTEM_03_CANONICAL_PRIMITIVES = {
  WORKSPACE_COMPOSITION: "SceWorkspaceChrome",
  WORKSPACE_HEADER: "SceWorkspaceHeader",
  WORKSPACE_SURFACE: "SceWorkspaceSurface",
  PAGE_FRAME: "PageShell",
  BREADCRUMBS: "SceBreadcrumbs",
  CONTEXT_TABS: "SceContextTabs",
  GLOBAL_NAVIGATION: "AppShellNavigation",
} as const;

export const SCE_DESIGN_SYSTEM_03_PO_FLAGS = {
  ...SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
  BREADCRUMBS_CANONICAL_NAVIGATION_LANGUAGE: "YES",
  CONTEXT_TABS_CANONICAL: "SceContextTabs",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  COMMUNICATION_IS_UNIVERSAL_PAGE_TEMPLATE: "NO",
  ACTIVITY_TAB_ARROW_KEY_ACCESSIBILITY: "IMPLEMENTED",
  DOMAIN_SPECIFIC_REVIEW_REQUIRED_AT_DS10: "YES",
  MANUAL_UAT_BY_CURSOR: "SKIPPED_PO_OWNED",
  SCREENSHOTS_BY_CURSOR: "SKIPPED_PO_OWNED",
} as const;

export const SCE_DESIGN_SYSTEM_03_PO_CLOSURE = {
  PO_WORKSPACE_SYSTEM_REVIEW: "PASS",
  PO_BREADCRUMB_SYSTEM_REVIEW: "PASS",
  PO_CONTEXT_TAB_SYSTEM_REVIEW: "PASS",
  PO_NAVIGATION_ARCHITECTURE_REVIEW: "PASS",
  DS03_STATUS: "CLOSED / ACCEPTED / MERGED",
  FEATURE_HEAD: "46de14ffcbc089c773928234e60e6c3679f0022e",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-04",
} as const;

export type SceWorkspaceAuditClassification =
  | "ALREADY_CANONICAL"
  | "CANONICAL_WITH_REFINEMENT"
  | "MIGRATE_IN_DS03"
  | "MIGRATE_LATER"
  | "DOMAIN_SPECIFIC_BUT_ALIGNED"
  | "DEPRECATE_REPLACE";

export type SceWorkspaceAuditEntry = {
  area: string;
  routes: string;
  classification: SceWorkspaceAuditClassification;
  contextTabs: "USE_CONTEXT_TABS" | "DO_NOT_REQUIRE_CONTEXT_TABS";
  notes: string;
};

/** Product-wide workspace audit (DS-03 programme input + DS-10 gate). */
export const SCE_DESIGN_SYSTEM_03_WORKSPACE_AUDIT: SceWorkspaceAuditEntry[] = [
  {
    area: "Dashboard",
    routes: "/dashboard",
    classification: "CANONICAL_WITH_REFINEMENT",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Module KPI cards; adopt breadcrumbs/header in DS-04",
  },
  {
    area: "Mein Programm",
    routes: "/dashboard/mein-programm",
    classification: "MIGRATE_IN_DS03",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "SceWorkspaceChrome + breadcrumbs adopted DS-03",
  },
  {
    area: "Club",
    routes: "/dashboard/vereine, club directory",
    classification: "CANONICAL_WITH_REFINEMENT",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Calm header rollout DS-04",
  },
  {
    area: "Teams",
    routes: "/dashboard/teams/[teamId]/*",
    classification: "DOMAIN_SPECIFIC_BUT_ALIGNED",
    contextTabs: "USE_CONTEXT_TABS",
    notes: "TeamCockpitNav route tabs — domain URL model retained",
  },
  {
    area: "Match",
    routes: "/dashboard/matchcenter/*",
    classification: "ALREADY_CANONICAL",
    contextTabs: "USE_CONTEXT_TABS",
    notes: "SceContextTabs activity nav",
  },
  {
    area: "Training",
    routes: "/dashboard/training/*",
    classification: "ALREADY_CANONICAL",
    contextTabs: "USE_CONTEXT_TABS",
    notes: "Activity detail tabs + record shells",
  },
  {
    area: "Tournament",
    routes: "/dashboard/tournamentcenter/*",
    classification: "ALREADY_CANONICAL",
    contextTabs: "USE_CONTEXT_TABS",
    notes: "Activity tabs + planner density preserved",
  },
  {
    area: "Club Event",
    routes: "/dashboard/veranstaltungen/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    contextTabs: "USE_CONTEXT_TABS",
    notes: "Cards canonical; header refine DS-04",
  },
  {
    area: "Wochenplaner",
    routes: "/dashboard/wochenplan, /dashboard/planner/*",
    classification: "DOMAIN_SPECIFIC_BUT_ALIGNED",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Dense planning — DS-08 tokens",
  },
  {
    area: "Planning Hub",
    routes: "/dashboard/planning-hub/*",
    classification: "MIGRATE_LATER",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Operational calendar blocks DS-08",
  },
  {
    area: "Tournament Planner",
    routes: "planner tournament board",
    classification: "DOMAIN_SPECIFIC_BUT_ALIGNED",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Grids/DnD preserved",
  },
  {
    area: "Communication",
    routes: "/dashboard/communication/*",
    classification: "ALREADY_CANONICAL",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Primary visual reference; SceWorkspaceHeader alignment DS-03",
  },
  {
    area: "Publishing",
    routes: "/dashboard/website/*",
    classification: "MIGRATE_LATER",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Empty-state unification DS-07",
  },
  {
    area: "Documents (DAM)",
    routes: "/dashboard/workspace/*",
    classification: "MIGRATE_IN_DS03",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "WorkspaceBreadcrumbs → SceBreadcrumbs",
  },
  {
    area: "Admin",
    routes: "/dashboard/administration/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Mixed legacy forms DS-07",
  },
  {
    area: "Personen & Zugänge",
    routes: "/dashboard/persons/*",
    classification: "MIGRATE_IN_DS03",
    contextTabs: "USE_CONTEXT_TABS",
    notes: "PersonDetailTabs → SceContextTabs + ?tab= URLs",
  },
  {
    area: "Roles / Permissions",
    routes: "/dashboard/administration/roles/*",
    classification: "MIGRATE_IN_DS03",
    contextTabs: "USE_CONTEXT_TABS",
    notes: "RolesAdminTabs → SceContextTabs route tabs",
  },
  {
    area: "Facilities",
    routes: "pitches/resources admin",
    classification: "MIGRATE_LATER",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Table tokens DS-08",
  },
  {
    area: "Vereinsleitung",
    routes: "/vereinsleitung/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "PageBreadcrumbs via SceBreadcrumbs alias",
  },
  {
    area: "Infoboard admin",
    routes: "infoboard designer",
    classification: "MIGRATE_LATER",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Channel-specific chrome DS-10",
  },
  {
    area: "Sponsor / Commercial (future)",
    routes: "TBD",
    classification: "DEPRECATE_REPLACE",
    contextTabs: "DO_NOT_REQUIRE_CONTEXT_TABS",
    notes: "Future module",
  },
  {
    area: "Team workspace (future)",
    routes: "team cockpit evolution",
    classification: "DOMAIN_SPECIFIC_BUT_ALIGNED",
    contextTabs: "USE_CONTEXT_TABS",
    notes: "Target IA documented; no placeholder tabs",
  },
  {
    area: "Person workspace (future)",
    routes: "/dashboard/persons/[id]",
    classification: "MIGRATE_IN_DS03",
    contextTabs: "USE_CONTEXT_TABS",
    notes: "Canonical person 360° tabs",
  },
];

export type SceLegacyNavigationInventoryRow = {
  currentImplementation: string;
  routesOrDomain: string;
  classification: SceWorkspaceAuditClassification | "LEGACY_MIGRATE" | "CANONICAL";
  canonicalTarget: string;
  migrationPackage: string;
  status: "DS03_DONE" | "DS03_PARTIAL" | "DS10_REMAINING" | "JUSTIFIED_EXCEPTION";
  justifiedException?: string;
};

export const SCE_DESIGN_SYSTEM_03_LEGACY_NAV_INVENTORY: SceLegacyNavigationInventoryRow[] =
  [
    {
      currentImplementation: "PersonDetailTabs local tablist",
      routesOrDomain: "/dashboard/persons/[id]",
      classification: "MIGRATE_IN_DS03",
      canonicalTarget: "SceContextTabs",
      migrationPackage: "DS-03",
      status: "DS03_DONE",
    },
    {
      currentImplementation: "RolesAdminTabs underline links",
      routesOrDomain: "/dashboard/administration/roles/*",
      classification: "MIGRATE_IN_DS03",
      canonicalTarget: "SceContextTabs + tabRoutes",
      migrationPackage: "DS-03",
      status: "DS03_DONE",
    },
    {
      currentImplementation: "PageBreadcrumbs",
      routesOrDomain: "product-wide",
      classification: "CANONICAL",
      canonicalTarget: "SceBreadcrumbs",
      migrationPackage: "DS-03",
      status: "DS03_PARTIAL",
      justifiedException: "PageBreadcrumbs retained as alias during rollout",
    },
    {
      currentImplementation: "WorkspaceBreadcrumbs",
      routesOrDomain: "/dashboard/workspace",
      classification: "MIGRATE_IN_DS03",
      canonicalTarget: "SceBreadcrumbs",
      migrationPackage: "DS-03",
      status: "DS03_DONE",
    },
    {
      currentImplementation: "TeamCockpitNav",
      routesOrDomain: "/dashboard/teams/[teamId]/*",
      classification: "DOMAIN_SPECIFIC_BUT_ALIGNED",
      canonicalTarget: "SceContextTabs visual parity (optional)",
      migrationPackage: "DS-10",
      status: "JUSTIFIED_EXCEPTION",
      justifiedException: "Route-segment team cockpit URL model is domain-authoritative",
    },
    {
      currentImplementation: "ProgrammeViewSwitcher",
      routesOrDomain: "/dashboard/mein-programm",
      classification: "DOMAIN_SPECIFIC_BUT_ALIGNED",
      canonicalTarget: "View switcher (not object tabs)",
      migrationPackage: "DS-10",
      status: "JUSTIFIED_EXCEPTION",
      justifiedException: "Liste/Kalender mode switch — not contextual object subviews",
    },
    {
      currentImplementation: "CommunicationInboxToolbar tablist",
      routesOrDomain: "communication inbox filters",
      classification: "DOMAIN_SPECIFIC_BUT_ALIGNED",
      canonicalTarget: "Filter toolbar",
      migrationPackage: "DS-10",
      status: "JUSTIFIED_EXCEPTION",
      justifiedException: "Inbox filter modes, not workspace context tabs",
    },
    {
      currentImplementation: "SceActivityComposerWorkflowNav",
      routesOrDomain: "activity composer overlay",
      classification: "CANONICAL",
      canonicalTarget: "SceContextTabs localNavigation",
      migrationPackage: "DS-03",
      status: "DS03_PARTIAL",
      justifiedException: "Composer uses localNavigation overlay contract",
    },
    {
      currentImplementation: "BillingWorkspaceNav",
      routesOrDomain: "billing module",
      classification: "LEGACY_MIGRATE",
      canonicalTarget: "SceContextTabs",
      migrationPackage: "DS-10",
      status: "DS03_DONE",
    },
    {
      currentImplementation: "AdminSectionHeader",
      routesOrDomain: "legacy admin modules",
      classification: "LEGACY_MIGRATE",
      canonicalTarget: "SceWorkspaceHeader",
      migrationPackage: "DS-10",
      status: "DS03_DONE",
    },
  ];

export const SCE_DESIGN_SYSTEM_03_DOC_MARKERS = [
  "SCE-DESIGN-SYSTEM-03",
  "SceWorkspaceChrome",
  "SceWorkspaceHeader",
  "SceBreadcrumbs",
  "WORKSPACE_SYSTEM_PRODUCT_WIDE",
  "BREADCRUMB_SYSTEM_PRODUCT_WIDE",
  "SceContextTabs",
  "ACTIVITY_TAB_ARROW_KEY_ACCESSIBILITY",
  "COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE",
  "UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE",
] as const;

export const SCE_DESIGN_SYSTEM_03_GOVERNANCE = {
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
  CANONICAL_PRIMITIVES_USED: Object.values(SCE_DESIGN_SYSTEM_03_CANONICAL_PRIMITIVES),
  NEW_PRIMITIVES_INTRODUCED: [
    "SceBreadcrumbs",
    "SceWorkspaceHeader",
    "SceWorkspaceChrome",
  ],
  NEW_PRIMITIVES_JUSTIFICATION:
    "Single product-wide workspace composition and breadcrumb family — no parallel frameworks.",
  PARALLEL_PATTERN_INTRODUCED: "NO",
  WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE: "PASS",
  BINARY_CONTROL_COMPLIANCE: "PASS",
  NEW_BINARY_CHECKBOXES: 0,
  CANONICAL_TOGGLES_USED: "YES",
  MULTI_SELECTION_PATTERN: "CHECKBOX_FOR_MULTI_SELECT_UNCHANGED",
  PRODUCT_WIDE_WORKSPACE_MIGRATION_REQUIRED: "YES",
  UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE: "NO",
  DOMAIN_SPECIFIC_REVIEW_REQUIRED_AT_DS10: "YES",
  RESPONSIVE_COMPLIANCE: "PARTIAL_DS09_FINAL",
  ACCESSIBILITY_COMPLIANCE: "PARTIAL_DS09_FINAL",
} as const;
