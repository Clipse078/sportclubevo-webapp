/**
 * SCE-DESIGN-SYSTEM-04 — cards & information presentation metadata & audit.
 */
import { SCE_INFORMATION_HIERARCHY_LAYERS } from "@/lib/design-system/sce-card-information-hierarchy";
import { SCE_WORKSPACE_PRODUCT_WIDE_FLAGS } from "@/lib/design-system/sce-workspace-hierarchy";

export const SCE_DESIGN_SYSTEM_04_PACKAGE_KEY = "SCE-DESIGN-SYSTEM-04" as const;

export const SCE_DESIGN_SYSTEM_04_PREDECESSOR = "SCE-DESIGN-SYSTEM-03" as const;

export const SCE_DESIGN_SYSTEM_04_CANONICAL_CARD_PRIMITIVES = {
  INFORMATION_SURFACE: "SceInformationSurface",
  CAPABILITY_FUNCTIONAL: "SceFeatureCard",
  CAPABILITY_NAVIGATION: "CommunicationHubCapabilityLink",
  SUMMARY_METRIC: "DashboardKpiCard",
  OBJECT_IDENTITY_CLUB: "SceClubCard",
  ACTIVITY_MATCH: "SceMatchCard",
  ACTIVITY_TRAINING: "SceTrainingCard",
  ACTIVITY_TOURNAMENT: "SceTournamentCard",
  ACTIVITY_CLUB_EVENT: "SceClubEventCard",
  ACTIVITY_PROGRAMME_SHELL: "SceProgrammeActivityCardShell",
  TOURNAMENT_FIXTURE: "SceTournamentFixtureCard",
  INFOBOARD_MATCH_IDENTITY: "InfoboardCompactMatchIdentity",
} as const;

export const SCE_DESIGN_SYSTEM_04_PO_FLAGS = {
  ...SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
  CARD_SYSTEM_PRODUCT_WIDE: "YES",
  COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE: "YES",
  COMMUNICATION_IS_UNIVERSAL_CARD_TEMPLATE: "NO",
  ACTIVITY_CARD_FAMILY_CANONICAL: "YES",
  WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE: "PASS",
  INFOBOARD_MATCH_PRESENTATION_P0: "CLOSED",
  PREMIUM_DOES_NOT_MEAN_OVERSIZED: "YES",
  MANUAL_UAT_BY_CURSOR: "SKIPPED_PO_OWNED",
  SCREENSHOTS_BY_CURSOR: "SKIPPED_PO_OWNED",
} as const;

export const SCE_DESIGN_SYSTEM_04_PO_CLOSURE = {
  PO_CARD_SYSTEM_REVIEW: "PASS",
  PO_INFORMATION_PRESENTATION_REVIEW: "PASS",
  PO_ACTIVITY_PRESENTATION_REVIEW: "PASS",
  PO_INFOBOARD_P0_REVIEW: "PASS",
  DS04_STATUS: "CLOSED / ACCEPTED",
  FEATURE_HEAD: "4057e5d2cc3766a2040f2de29acd3f2f7292d748",
  NEXT_PACKAGE: "SCE-DESIGN-SYSTEM-05",
} as const;

export type SceCardAuditClassification =
  | "CANONICAL"
  | "CANONICAL_WITH_REFINEMENT"
  | "DOMAIN_SPECIFIC_CANONICAL"
  | "MIGRATE_DS04"
  | "MIGRATE_LATER"
  | "DUPLICATE"
  | "DEPRECATE";

export type SceCardAuditEntry = {
  area: string;
  routes: string;
  classification: SceCardAuditClassification;
  canonicalTarget: string;
  notes: string;
};

/** Product-wide card / information presentation audit (DS-04 + DS-10 gate). */
export const SCE_DESIGN_SYSTEM_04_CARD_AUDIT: SceCardAuditEntry[] = [
  {
    area: "Dashboard",
    routes: "/dashboard",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "DashboardKpiCard + DashboardTodayEventCards",
    notes: "Summary metrics canonical; programme cards use activity family",
  },
  {
    area: "Mein Programm",
    routes: "/dashboard/mein-programm",
    classification: "CANONICAL",
    canonicalTarget: "SceProgrammeActivityCardShell + activity family",
    notes: "Programme Engine presentation",
  },
  {
    area: "Teams",
    routes: "/dashboard/teams/[teamId]/*",
    classification: "CANONICAL",
    canonicalTarget: "SceMatchCard / SceTrainingCard grids",
    notes: "Domain layouts preserved",
  },
  {
    area: "Match",
    routes: "/dashboard/matchcenter/*",
    classification: "CANONICAL",
    canonicalTarget: "SceMatchCard + SpieleManagementMatchRow",
    notes: "Operational rows aligned; bounded card grids",
  },
  {
    area: "Training",
    routes: "/dashboard/training/*",
    classification: "CANONICAL",
    canonicalTarget: "SceTrainingCard",
    notes: "Location hierarchy preserved",
  },
  {
    area: "Tournament",
    routes: "/dashboard/tournamentcenter/*",
    classification: "CANONICAL",
    canonicalTarget: "SceTournamentCard",
    notes: "Not match semantics",
  },
  {
    area: "Club Event",
    routes: "/dashboard/veranstaltungen/*",
    classification: "CANONICAL",
    canonicalTarget: "SceClubEventCard",
    notes: "Distinct from training/match/tournament",
  },
  {
    area: "Wochenplaner",
    routes: "/dashboard/wochenplan, planner",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "Weekplanner*IdentityCard + MICRO",
    notes: "Dense planner density preserved",
  },
  {
    area: "Planning Hub",
    routes: "/dashboard/planning-hub/*",
    classification: "MIGRATE_LATER",
    canonicalTarget: "PlanningHubListeSceActivityCard",
    notes: "Calendar blocks DS-08",
  },
  {
    area: "Tournament Planner",
    routes: "planner tournament board",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "SceTournamentFixtureCard",
    notes: "Fixture grid family — do not genericize",
  },
  {
    area: "Communication",
    routes: "/dashboard/communication/*",
    classification: "CANONICAL",
    canonicalTarget: "CommunicationHubCapabilityLink + SceFeatureCard",
    notes: "Primary visual reference for capability cards",
  },
  {
    area: "Publishing",
    routes: "/dashboard/website/*",
    classification: "MIGRATE_LATER",
    canonicalTarget: "CmsStatCard",
    notes: "DS-10",
  },
  {
    area: "Documents",
    routes: "/dashboard/workspace/*",
    classification: "MIGRATE_LATER",
    canonicalTarget: "SceInformationSurface",
    notes: "Object rows DS-10",
  },
  {
    area: "Personen & Zugänge",
    routes: "/dashboard/persons/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "Person identity panels",
    notes: "Object/identity presentation DS-10",
  },
  {
    area: "Roles / Permissions",
    routes: "/dashboard/administration/roles/*",
    classification: "MIGRATE_DS04",
    canonicalTarget: "SceInformationSurface + matrix tables",
    notes: "DS-04 representative admin adoption",
  },
  {
    area: "Facilities",
    routes: "facilities admin",
    classification: "MIGRATE_LATER",
    canonicalTarget: "Dense operational tables",
    notes: "DS-08",
  },
  {
    area: "Admin",
    routes: "/dashboard/administration/*",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "SceWorkspaceChrome + information panels",
    notes: "Mixed legacy forms DS-07",
  },
  {
    area: "Infoboard",
    routes: "kiosk screen 1/2",
    classification: "DOMAIN_SPECIFIC_CANONICAL",
    canonicalTarget: "matchPresentation + channel CSS",
    notes: "P0 fallback removed DS-04",
  },
  {
    area: "Sponsor / Commercial (future)",
    routes: "TBD",
    classification: "MIGRATE_LATER",
    canonicalTarget: "CommunicationHubCapabilityLink pattern",
    notes: "Capability cards without oversized tiles",
  },
  {
    area: "Team workspace (future)",
    routes: "team cockpit",
    classification: "CANONICAL",
    canonicalTarget: "Activity card family",
    notes: "Programme surfaces",
  },
  {
    area: "Person workspace (future)",
    routes: "/dashboard/persons/[id]",
    classification: "CANONICAL_WITH_REFINEMENT",
    canonicalTarget: "Programme + identity panels",
    notes: "Person programme consumes activity family",
  },
];

export type SceLegacyCardInventoryRow = {
  currentComponent: string;
  domainRoutes: string;
  classification: SceCardAuditClassification | "THIN_COMPATIBILITY_WRAPPER" | "REMOVE";
  canonicalTarget: string;
  ds04Action: string;
  futurePackage?: string;
  status: "DS04_DONE" | "DS04_PARTIAL" | "DS10_REMAINING" | "JUSTIFIED_EXCEPTION";
  justifiedException?: string;
};

export const SCE_DESIGN_SYSTEM_04_LEGACY_CARD_INVENTORY: SceLegacyCardInventoryRow[] =
  [
    {
      currentComponent: "MatchCard.tsx",
      domainRoutes: "legacy matchcenter",
      classification: "DEPRECATE",
      canonicalTarget: "SceMatchCard",
      ds04Action: "THIN_COMPATIBILITY_WRAPPER",
      futurePackage: "DS-10",
      status: "DS10_REMAINING",
    },
    {
      currentComponent: "VeranstaltungCard.tsx",
      domainRoutes: "legacy events",
      classification: "DEPRECATE",
      canonicalTarget: "SceClubEventCard",
      ds04Action: "MIGRATE_LATER",
      futurePackage: "DS-10",
      status: "DS10_REMAINING",
    },
    {
      currentComponent: "DashboardTodayEventCards",
      domainRoutes: "/dashboard",
      classification: "CANONICAL_WITH_REFINEMENT",
      canonicalTarget: "SceProgrammeActivityCardShell",
      ds04Action: "ALIGNED",
      status: "DS04_PARTIAL",
    },
    {
      currentComponent: "PlanningHubActivityBlock",
      domainRoutes: "planning-hub calendar",
      classification: "MIGRATE_LATER",
      canonicalTarget: "PlanningHubListeSceActivityCard",
      ds04Action: "DEFER",
      futurePackage: "DS-08",
      status: "DS10_REMAINING",
    },
    {
      currentComponent: "WochenplanEventCard",
      domainRoutes: "wochenplaner",
      classification: "DOMAIN_SPECIFIC_CANONICAL",
      canonicalTarget: "Weekplanner*IdentityCard",
      ds04Action: "JUSTIFIED_EXCEPTION",
      status: "JUSTIFIED_EXCEPTION",
      justifiedException: "Dense planner row — MICRO alignment",
    },
    {
      currentComponent: "InfoboardScreen1 legacy match fallback",
      domainRoutes: "kiosk screen 1",
      classification: "REMOVE",
      canonicalTarget: "matchPresentation",
      ds04Action: "REMOVED_DS04",
      status: "DS04_DONE",
    },
    {
      currentComponent: "InfoboardScreen2 tenant-relative match lines",
      domainRoutes: "kiosk screen 2",
      classification: "MIGRATE_DS04",
      canonicalTarget: "InfoboardCompactMatchIdentity",
      ds04Action: "MIGRATED_DS04",
      status: "DS04_DONE",
    },
    {
      currentComponent: "WaitingListWorkspace MetricCard",
      domainRoutes: "registrations",
      classification: "DUPLICATE",
      canonicalTarget: "DashboardKpiCard",
      ds04Action: "MIGRATE_LATER",
      futurePackage: "DS-10",
      status: "DS10_REMAINING",
    },
    {
      currentComponent: "CmsStatCard",
      domainRoutes: "CMS / publishing",
      classification: "CANONICAL_WITH_REFINEMENT",
      canonicalTarget: "DashboardKpiCard tokens",
      ds04Action: "ALIGN",
      futurePackage: "DS-10",
      status: "DS10_REMAINING",
    },
  ];

export const SCE_DESIGN_SYSTEM_04_DOC_MARKERS = [
  "SCE-DESIGN-SYSTEM-04",
  "CARD_SYSTEM_PRODUCT_WIDE",
  "SCE_INFORMATION_HIERARCHY_LAYERS",
  "SceInformationSurface",
  "COMMUNICATION_IS_UNIVERSAL_CARD_TEMPLATE",
  "INFOBOARD_MATCH_PRESENTATION_P0",
  "ACTIVITY_CARD_FAMILY_CANONICAL",
  "SCE-DESIGN-SYSTEM-04-CARD-INVENTORY",
] as const;

export const SCE_DESIGN_SYSTEM_04_GOVERNANCE = {
  SCE_DESIGN_SYSTEM_COMPLIANCE: "PASS",
  CANONICAL_PRIMITIVES_USED: Object.values(SCE_DESIGN_SYSTEM_04_CANONICAL_CARD_PRIMITIVES),
  NEW_PRIMITIVES_INTRODUCED: [
    "SceInformationSurface",
    "InfoboardCompactMatchIdentity",
  ],
  NEW_PRIMITIVES_JUSTIFICATION:
    "Composable information panel shell + shared Infoboard match identity block — no parallel card framework.",
  PARALLEL_PATTERN_INTRODUCED: "NO",
  CARD_SYSTEM_PRODUCT_WIDE: "YES",
  ACTIVITY_CARD_FAMILY_CANONICAL: "YES",
  WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE: "PASS",
  INFOBOARD_MATCH_PRESENTATION_P0: "CLOSED",
  BINARY_CONTROL_COMPLIANCE: "PASS",
  NEW_BINARY_CHECKBOXES: 0,
  CANONICAL_TOGGLES_USED: "YES",
  MULTI_SELECTION_PATTERN: "CHECKBOX_FOR_MULTI_SELECT_UNCHANGED",
  RESPONSIVE_COMPLIANCE: "PARTIAL_DS09_FINAL",
  ACCESSIBILITY_COMPLIANCE: "PARTIAL_DS09_FINAL",
  INFORMATION_HIERARCHY_LAYERS: SCE_INFORMATION_HIERARCHY_LAYERS,
  UNEXPLAINED_LEGACY_CARD_FAMILIES_ALLOWED_AT_DS10_CLOSURE: "NO",
} as const;
