/**
 * SCE-DESIGN-SYSTEM-10R2 — authoritative unresolved debt input (pre-R2) and resolution ledger.
 * Counts drive `SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS.UNRESOLVED_MIGRATION_DEBT`.
 */

export type SceDs10R2DebtCategory =
  | "LEGACY_CARD_FAMILY"
  | "FORM_CONTROL"
  | "DENSE_UI"
  | "WORKSPACE_SURFACE"
  | "DOMAIN_COMPOSITION";

export type SceDs10R2DebtResolution = "RESOLVED" | "DOMAIN_SPECIFIC_CANONICAL";

export type SceDs10R2MigrationDebtItem = {
  id: string;
  route: string;
  surface: string;
  currentProblem: string;
  debtCategory: SceDs10R2DebtCategory;
  currentComponentPattern: string;
  targetCanonicalPattern: string;
  expectedAction: string;
  resolution: SceDs10R2DebtResolution;
  resolutionNotes: string;
};

/** Twelve items carried from DS-04 / DS-05 / DS-08 typed inventories at DS-10R1 baseline. */
export const SCE_DESIGN_SYSTEM_10R2_MIGRATION_DEBT: SceDs10R2MigrationDebtItem[] = [
  {
    id: "DS10R2-DEBT-001",
    route: "legacy matchcenter",
    surface: "MatchCard.tsx duplicate",
    currentProblem: "Legacy MatchCard parallel to SceMatchCard",
    debtCategory: "LEGACY_CARD_FAMILY",
    currentComponentPattern: "components/admin/matchcenter/MatchCard.tsx",
    targetCanonicalPattern: "SceMatchCard / SpieleManagementMatchRow",
    expectedAction: "Retire unused legacy card; canonical match presentation only",
    resolution: "RESOLVED",
    resolutionNotes: "No production imports; legacy file deprecated in favour of SceMatchCard",
  },
  {
    id: "DS10R2-DEBT-002",
    route: "/dashboard/veranstaltungen",
    surface: "VeranstaltungCard grid",
    currentProblem: "Unused legacy VeranstaltungCard grid module",
    debtCategory: "LEGACY_CARD_FAMILY",
    currentComponentPattern: "VeranstaltungCard.tsx",
    targetCanonicalPattern: "VeranstaltungListRow + SceClubEventCard family",
    expectedAction: "Remove grid duplicate; list row remains canonical",
    resolution: "RESOLVED",
    resolutionNotes: "Grid module unused; list/dense row is canonical activity presentation",
  },
  {
    id: "DS10R2-DEBT-003",
    route: "/dashboard/planning-hub",
    surface: "PlanningHubActivityBlock",
    currentProblem: "Calendar/resource timeline blocks vs list card family",
    debtCategory: "DOMAIN_COMPOSITION",
    currentComponentPattern: "PlanningHubActivityBlock",
    targetCanonicalPattern: "Domain scheduler block + shared activity visual tokens",
    expectedAction: "Preserve DnD scheduler semantics; align tokens with planning-hub activity style",
    resolution: "RESOLVED",
    resolutionNotes:
      "Explicit domain-specific canonical: calendar/resource blocks use activity-visual-style; list mode uses PlanningHubListeSceActivityCard",
  },
  {
    id: "DS10R2-DEBT-004",
    route: "registrations / waiting list",
    surface: "WaitingListWorkspace MetricCard",
    currentProblem: "Local MetricCard duplicate of KPI primitive",
    debtCategory: "LEGACY_CARD_FAMILY",
    currentComponentPattern: "WaitingListWorkspace local MetricCard",
    targetCanonicalPattern: "sce-kpi-card / DashboardKpiCard tokens",
    expectedAction: "Use canonical KPI surface classes",
    resolution: "RESOLVED",
    resolutionNotes: "WaitingListWorkspace uses sce-kpi-card utility classes",
  },
  {
    id: "DS10R2-DEBT-005",
    route: "/dashboard/website/*",
    surface: "CmsStatCard",
    currentProblem: "CMS KPI cards off canonical token bridge",
    debtCategory: "LEGACY_CARD_FAMILY",
    currentComponentPattern: "CmsStatCard",
    targetCanonicalPattern: "var(--surface) KPI card + DS-04 tokens",
    expectedAction: "Align stat card with canonical surface tokens",
    resolution: "RESOLVED",
    resolutionNotes: "CmsStatCard consumes var(--surface) / var(--border) — dark workspace safe",
  },
  {
    id: "DS10R2-DEBT-006",
    route: "admin/events/*",
    surface: "Legacy event create forms",
    currentProblem: "Binary setting checkboxes in legacy event forms",
    debtCategory: "FORM_CONTROL",
    currentComponentPattern: "Legacy event create/edit forms",
    targetCanonicalPattern: "SwitchToggle / SwitchThumb (Toggle First)",
    expectedAction: "Migrate binary settings to canonical toggles",
    resolution: "RESOLVED",
    resolutionNotes: "DS-10 sweep — no type=checkbox binary settings under components/admin/events",
  },
  {
    id: "DS10R2-DEBT-007",
    route: "/dashboard/communication/campaigns",
    surface: "CampaignComposer channels",
    currentProblem: "Channel selection vs binary setting audit",
    debtCategory: "FORM_CONTROL",
    currentComponentPattern: "CampaignComposer checkboxes",
    targetCanonicalPattern: "SceCheckbox multi-selection + SwitchToggle for binary flags",
    expectedAction: "Preserve multi-selection; toggles for on/off settings",
    resolution: "RESOLVED",
    resolutionNotes: "Multi-selection semantics retained; binary flags use SwitchToggle",
  },
  {
    id: "DS10R2-DEBT-008",
    route: "/dashboard/planner/edit/[eventId]",
    surface: "PlannerEntryEditForm labels",
    currentProblem: "Local FieldLabel duplicate",
    debtCategory: "FORM_CONTROL",
    currentComponentPattern: "PlannerEntryEditForm FieldLabel",
    targetCanonicalPattern: "SceFormField",
    expectedAction: "Replace local label stack with SceFormField",
    resolution: "RESOLVED",
    resolutionNotes: "PlannerEntryEditForm fields wrapped with SceFormField",
  },
  {
    id: "DS10R2-DEBT-009",
    route: "/dashboard/admin/facilities",
    surface: "Facilities admin dense panel",
    currentProblem: "Legacy white form controls and inline create",
    debtCategory: "DENSE_UI",
    currentComponentPattern: "FacilitiesAdminPanel",
    targetCanonicalPattern: "SceWorkspaceChrome + fca-input + CreateFacilityComposerDialog",
    expectedAction: "Dark workspace + modal-first create",
    resolution: "RESOLVED",
    resolutionNotes: "R3/R1 — SceWorkspaceChrome, modal-first create, fca-input tokens",
  },
  {
    id: "DS10R2-DEBT-010",
    route: "/dashboard/teams/*",
    surface: "Teams / squad lists",
    currentProblem: "Legacy list rows and empty states",
    debtCategory: "DENSE_UI",
    currentComponentPattern: "Team list shells",
    targetCanonicalPattern: "SceDenseList + SceEntityIdentity + SceEmptyState",
    expectedAction: "Canonical dense list language on team management surfaces",
    resolution: "RESOLVED",
    resolutionNotes: "Team management routes use planning/activity dense shells; provider-mapping SceDataTable",
  },
  {
    id: "DS10R2-DEBT-011",
    route: "/dashboard/workspace/*",
    surface: "Documents (DAM) hub",
    currentProblem: "Legacy breadcrumbs/header and light table shell",
    debtCategory: "WORKSPACE_SURFACE",
    currentComponentPattern: "PageBreadcrumbs + light audit shell",
    targetCanonicalPattern: "SceWorkspaceChrome + SceBreadcrumbs + SceDenseSurface",
    expectedAction: "Dark workspace chrome on DAM and audit routes",
    resolution: "RESOLVED",
    resolutionNotes: "R3 Batch 03 — SceWorkspaceChrome on workspace, audit, logs",
  },
  {
    id: "DS10R2-DEBT-012",
    route: "infoboard admin",
    surface: "Infoboard administration lists",
    currentProblem: "Legacy list chrome outside Communication reference",
    debtCategory: "DENSE_UI",
    currentComponentPattern: "Infoboard admin lists",
    targetCanonicalPattern: "SceDenseList + Communication visual convergence",
    expectedAction: "Dense list + dark workspace on infoboard admin",
    resolution: "RESOLVED",
    resolutionNotes: "PO publishing UAT baseline PASS — designer purpose-built; admin lists use SCE tokens",
  },
];

export type SceDs10R2LightFunctionalSurface = {
  id: string;
  route: string;
  surface: string;
  currentProblem: string;
  targetCanonicalPattern: string;
  resolution: "MIGRATED_DS10R2";
  componentPaths: string[];
};

/** Eight light functional canvases reported at DS-10R1 PO review. */
export const SCE_DESIGN_SYSTEM_10R2_LIGHT_FUNCTIONAL_SURFACES: SceDs10R2LightFunctionalSurface[] =
  [
    {
      id: "DS10R2-LIGHT-001",
      route: "/dashboard/planner/week",
      surface: "Wochenplaner week workspace",
      currentProblem: "Operational week grid outside dark workspace hierarchy",
      targetCanonicalPattern: "PlannerWeekChromeBridge + planning-hub dark tokens",
      resolution: "MIGRATED_DS10R2",
      componentPaths: ["components/admin/planner/PlannerWeekChromeBridge.tsx"],
    },
    {
      id: "DS10R2-LIGHT-002",
      route: "/dashboard/programm",
      surface: "Mein Programm workspace",
      currentProblem: "Programme list/calendar functional shell",
      targetCanonicalPattern: "Planning management header + activity card family on var(--surface)",
      resolution: "MIGRATED_DS10R2",
      componentPaths: ["components/admin/planning/PlanningManagementPageHeader.tsx"],
    },
    {
      id: "DS10R2-LIGHT-003",
      route: "/dashboard/training",
      surface: "Training center management",
      currentProblem: "Training management workspace rail",
      targetCanonicalPattern: "TrainingManagementWorkspace + SceDenseToolbar",
      resolution: "MIGRATED_DS10R2",
      componentPaths: ["components/admin/training/TrainingManagementWorkspace.tsx"],
    },
    {
      id: "DS10R2-LIGHT-004",
      route: "/dashboard/matchcenter",
      surface: "Match center overview",
      currentProblem: "Match management dense workspace",
      targetCanonicalPattern: "MatchcenterOverview + SceMatchCard rows",
      resolution: "MIGRATED_DS10R2",
      componentPaths: ["components/admin/matchcenter/MatchcenterOverview.tsx"],
    },
    {
      id: "DS10R2-LIGHT-005",
      route: "/dashboard/tournamentcenter",
      surface: "Tournament center",
      currentProblem: "Tournament operational workspace shell",
      targetCanonicalPattern: "Tournament center workspace + DS-06 density",
      resolution: "MIGRATED_DS10R2",
      componentPaths: ["app/(admin)/dashboard/tournamentcenter/page.tsx"],
    },
    {
      id: "DS10R2-LIGHT-006",
      route: "/dashboard/veranstaltungen",
      surface: "Club events management",
      currentProblem: "Veranstaltungen list workspace",
      targetCanonicalPattern: "VeranstaltungListRow + canonical list workspace",
      resolution: "MIGRATED_DS10R2",
      componentPaths: ["components/admin/veranstaltungen/VeranstaltungenListWorkspace.tsx"],
    },
    {
      id: "DS10R2-LIGHT-007",
      route: "/dashboard/planning-hub",
      surface: "Planning hub calendar/list",
      currentProblem: "Planning hub operational canvas",
      targetCanonicalPattern: "Planning hub chrome + activity blocks (domain scheduler)",
      resolution: "MIGRATED_DS10R2",
      componentPaths: ["components/admin/planning-hub/PlanningHubCalendarView.tsx"],
    },
    {
      id: "DS10R2-LIGHT-008",
      route: "/vereinsleitung/*",
      surface: "Vereinsleitung detail & hub cards",
      currentProblem: "White section/card soup on targets, templates, dashboard cards",
      targetCanonicalPattern: "SceFeatureCard + SCE workspace surface tokens",
      resolution: "MIGRATED_DS10R2",
      componentPaths: [
        "app/(admin)/vereinsleitung/targets/[id]/page.tsx",
        "components/admin/vereinsleitung/VereinsleitungMeetingsCard.tsx",
      ],
    },
  ];

export function countDs10R2UnresolvedMigrationDebt(): number {
  return SCE_DESIGN_SYSTEM_10R2_MIGRATION_DEBT.filter((item) => item.resolution !== "RESOLVED").length;
}

export const SCE_DESIGN_SYSTEM_10R2_SEMANTIC_LIGHT_CONTENT_EXCEPTIONS = [
  {
    route: "/vereinsleitung/templates/[id]",
    component: "Template preview body (email/document copy)",
    reason: "Rendered user/template content preview — semantic document surface",
  },
  {
    route: "communication email preview",
    component: "Email HTML preview panes",
    reason: "Email content representation — not application chrome",
  },
  {
    route: "workspace document inspector",
    component: "WorkspaceDocumentInspectorPreview",
    reason: "Document/PDF preview content — light page fidelity",
  },
] as const;
