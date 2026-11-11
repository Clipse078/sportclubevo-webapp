/**
 * SCE-UX-01 — Interaction & workflow architecture audit (evidence contracts).
 * @see docs/ux/SCE-UX-01-interaction-workflow-audit.md
 */

export const SCE_UX_01_DESIGN_PRINCIPLE =
  "Simple understanding. Shallow navigation. Deep capability." as const;

export type SceUx01InteractionPattern =
  | "INLINE_EDIT"
  | "MODAL_DECISION"
  | "DRAWER_CONTEXT"
  | "FULL_PAGE_WORKFLOW"
  | "GUIDED_STEPS";

export type SceUx01DecisionRule = {
  pattern: SceUx01InteractionPattern;
  when: string;
  canonicalPrimitive: string;
  dirtyGuard: "REQUIRED" | "RECOMMENDED" | "OPTIONAL" | "N_A";
  mobileBehavior: string;
  avoidWhen: string;
};

/** Interaction-pattern decision matrix — normative for new work; audit-only (no runtime enforcement yet). */
export const SCE_UX_01_DECISION_MATRIX: SceUx01DecisionRule[] = [
  {
    pattern: "INLINE_EDIT",
    when: "Single field or ≤3 related fields on a list row, card, or calendar cell; reversible; parent context must stay visible.",
    canonicalPrimitive:
      "SceInlineEditor · SceExpandablePanel · domain inline expand (e.g. FacilitiesAdminPanel)",
    dirtyGuard: "OPTIONAL",
    mobileBehavior: "Prefer full-width expand; avoid nested scroll inside cards on ≤768px.",
    avoidWhen: "Cross-entity dependencies, permission gates, or >~6 inputs.",
  },
  {
    pattern: "MODAL_DECISION",
    when: "Short create/edit (≤~12 fields), destructive confirm, or reversible decision; user should not leave list/workspace.",
    canonicalPrimitive:
      "Dialog (size workspace|lg) on SceModalOverlay · SceConfirmDialog · *CreateComposerDialog",
    dirtyGuard: "RECOMMENDED",
    mobileBehavior: "SCE_DIALOG_MOBILE_VIEWPORT_SHELL — full-viewport form dialog; one primary action.",
    avoidWhen: "Multi-tab workflows, guided sequences, or forms that need persistent URL (deep link only).",
  },
  {
    pattern: "DRAWER_CONTEXT",
    when: "Inspect + light edit while preserving spatial context (grid, list, match board); secondary workflow.",
    canonicalPrimitive: "Sheet (contextualPanel for planning) · registration/person detail drawers",
    dirtyGuard: "RECOMMENDED",
    mobileBehavior: "Sheet is full-height end panel; close restores underlying scroll (useSceModalDialog).",
    avoidWhen: "Primary create flows that DS-09 routes to workspace Dialog composers.",
  },
  {
    pattern: "FULL_PAGE_WORKFLOW",
    when: "Complex entity lifecycle (activity record tabs, team registration, tasks full create, CMS builder, finance structure).",
    canonicalPrimitive:
      "SceWorkspaceChrome + SceContextTabs + route ?tab= · ListPagePattern / DetailPagePattern",
    dirtyGuard: "REQUIRED",
    mobileBehavior: "Document scroll; stack chrome (breadcrumb collapse); avoid overlay-on-page.",
    avoidWhen: "Simple entity create where modal-first DS-09 already canonical.",
  },
  {
    pattern: "GUIDED_STEPS",
    when: "Ordered validation (activity create, access wizard, team registration); user may skip ahead but steps signal review state.",
    canonicalPrimitive:
      "SceActivityComposer guidedWorkflow · PeopleAccessWizard + WizardStepIndicator · TeamRegistrationWizard",
    dirtyGuard: "REQUIRED",
    mobileBehavior: "Same shell as parent pattern; footer Zurück/Weiter sticky; progress always visible.",
    avoidWhen: "Locked wizards with no free tab navigation (prefer composer 01E-R6 semantics).",
  },
];

export type SceUx01DomainFinding = {
  domain: string;
  representativeRoutes: string[];
  primaryPatterns: SceUx01InteractionPattern[];
  evidence: string[];
  inconsistencies: string[];
  clubDevelopment20Relevance: "HIGH" | "MEDIUM" | "LOW";
};

export const SCE_UX_01_DOMAIN_AUDIT: SceUx01DomainFinding[] = [
  {
    domain: "Club Development (Vereinsentwicklung)",
    representativeRoutes: [
      "/vereinsleitung/club-entwicklung",
      "/vereinsleitung/targets",
      "/vereinsleitung/initiativen",
      "/vereinsleitung/meetings",
      "/vereinsleitung/prozesse",
    ],
    primaryPatterns: ["MODAL_DECISION", "FULL_PAGE_WORKFLOW"],
    evidence: [
      "CreateTargetComposerDialog · CreateInitiativeComposerDialog · CreateMeetingComposerDialog (Dialog size=workspace)",
      "Target/Initiative/Meeting forms shared with /new deep-link routes (layout=composer)",
      "club-entwicklung hub is demo KPI surface (DEMO_PROCESSES) — Club Development 2.0 not started",
    ],
    inconsistencies: [
      "Hub vs list create parity not yet unified under SceWorkspaceChrome",
      "Process domain (prozesse) interaction model undefined vs modal-first siblings",
      "No SceContextDirtyGuard on composer dialogs (inline close/backdrop)",
    ],
    clubDevelopment20Relevance: "HIGH",
  },
  {
    domain: "Finance",
    representativeRoutes: ["/dashboard/finance", "/dashboard/finance/*"],
    primaryPatterns: ["FULL_PAGE_WORKFLOW", "DRAWER_CONTEXT", "MODAL_DECISION"],
    evidence: [
      "SceWorkspaceChrome reference workspace (DS2-06)",
      "FinanceCommitmentWorkspacePanel · reporting Sheets",
      "FinanceScenarioGovernanceDialogs retain-modal (sce-ds2-06-modal-migration-inventory)",
    ],
    inconsistencies: [
      "Mix of Sheet vs Dialog for inspection surfaces",
      "Some panels use legacy fca-button classes in adjacent flows",
    ],
    clubDevelopment20Relevance: "LOW",
  },
  {
    domain: "Teams & Persons",
    representativeRoutes: [
      "/dashboard/teams",
      "/dashboard/teams/register",
      "/dashboard/teams/[teamId]",
      "/dashboard/persons",
      "/dashboard/persons/[personId]",
    ],
    primaryPatterns: ["FULL_PAGE_WORKFLOW", "DRAWER_CONTEXT", "GUIDED_STEPS"],
    evidence: [
      "TeamRegistrationWizard full-page (VALID exception to modal-first)",
      "Team squad/trainer Sheets (TeamSquadManagementCard · PlayerReleasePlanningSheet ~850 LOC)",
      "PersonCreateSheet (Sheet) vs persons/new page",
      "PersonDetailTabs local tab state (legacy per SCE-CONTEXT-TABS-STANDARD)",
    ],
    inconsistencies: [
      "Oversized Sheets (player release planning) blur drawer vs full-page boundary",
      "Person create: Sheet on list vs /new route — dual entry",
      "Team cockpit uses route tabs; person detail uses local tabs",
    ],
    clubDevelopment20Relevance: "MEDIUM",
  },
  {
    domain: "Matches & Tournaments",
    representativeRoutes: [
      "/dashboard/matchcenter",
      "/dashboard/matchcenter/new",
      "/dashboard/tournamentcenter",
      "/dashboard/tournamentcenter/new",
    ],
    primaryPatterns: ["FULL_PAGE_WORKFLOW", "GUIDED_STEPS", "MODAL_DECISION"],
    evidence: [
      "SceActivityComposer for Training/Match/Tournament/Veranstaltung create",
      "SpieleMatchRecordWorkspace + SceContextTabs + dirty guard",
      "SceClubTeamSelectorDialog elevated over composer (justified nested dialog)",
    ],
    inconsistencies: [
      "Dual entry: overlay composer vs /new page routes",
      "Match operational collapsible vs modal inventory accordion pattern",
    ],
    clubDevelopment20Relevance: "LOW",
  },
  {
    domain: "Planning",
    representativeRoutes: [
      "/dashboard/planner",
      "/dashboard/wochenplan",
      "/dashboard/planning-hub",
    ],
    primaryPatterns: ["DRAWER_CONTEXT", "MODAL_DECISION", "FULL_PAGE_WORKFLOW"],
    evidence: [
      "Weekplanner*Sheet contextualPanel (DS2-06-D)",
      "PlanningHubConflictWorkspaceDialog retain-modal",
      "PlanningHubManipulationModalShell",
    ],
    inconsistencies: [
      "Conflict resolution modal vs sheet variants coexist",
      "Day planner select a11y recently hardened (DS2-07G) — pattern reference for pickers",
    ],
    clubDevelopment20Relevance: "LOW",
  },
  {
    domain: "Administration",
    representativeRoutes: [
      "/dashboard/admin/people-access",
      "/dashboard/administration/roles",
      "/dashboard/admin/tenants",
      "/dashboard/administration/roles/new",
    ],
    primaryPatterns: ["MODAL_DECISION", "GUIDED_STEPS", "DRAWER_CONTEXT"],
    evidence: [
      "PeopleAccessWizardDialog (4-step) + PersonAccessDrawer tabs",
      "CreateTenantRoleComposerDialog",
      "SCE-ADMIN-ACCESS-UX-01 documentation",
    ],
    inconsistencies: [
      "Wizard in Dialog without documented dirty guard",
      "Role create: modal + /new deep link (intentional DS-09)",
    ],
    clubDevelopment20Relevance: "MEDIUM",
  },
];

export type SceUx01ImplementationPackage = {
  id: string;
  title: string;
  scope: string;
  patterns: SceUx01InteractionPattern[];
  dependencies: string[];
  risks: string[];
  priority: 1 | 2 | 3;
};

export const SCE_UX_01_IMPLEMENTATION_PACKAGES: SceUx01ImplementationPackage[] = [
  {
    id: "SCE-UX-01A",
    title: "Club Development composer contract",
    scope:
      "Unify Target/Initiative/Meeting/Process create-edit under shared composer shell (Dialog workspace + layout=composer forms), SceWorkspaceChrome on lists, dirty-close parity.",
    patterns: ["MODAL_DECISION", "FULL_PAGE_WORKFLOW"],
    dependencies: ["DS2-06 page primitives", "SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT"],
    risks: ["Oversized workspace dialogs if Process domain adds long checklists"],
    priority: 1,
  },
  {
    id: "SCE-UX-01B",
    title: "Unsaved-change guard matrix",
    scope:
      "Document and adopt SceContextDirtyGuardProvider for workspace Dialog composers and Sheets >400 LOC; align Escape/backdrop with confirmNavigationIfDirty.",
    patterns: ["MODAL_DECISION", "DRAWER_CONTEXT", "FULL_PAGE_WORKFLOW"],
    dependencies: ["lib/context-tabs/ContextDirtyNavigationContext.tsx", "use-composer-close-guard"],
    risks: ["Inconsistent confirm copy across domains"],
    priority: 1,
  },
  {
    id: "SCE-UX-01C",
    title: "Oversized surface split guidelines",
    scope:
      "Split RegistrationDetailDrawer, PlayerReleasePlanningSheet, PeopleAccessWizard into tabbed Sheet or routed sub-workflows when field count exceeds threshold.",
    patterns: ["DRAWER_CONTEXT", "GUIDED_STEPS"],
    dependencies: ["SCE-UX-01B", "SceContextTabs for drawer tabs where URL needed"],
    risks: ["Regression in team release planning flows"],
    priority: 2,
  },
  {
    id: "SCE-UX-01D",
    title: "Context tab legacy migration register",
    scope: "PersonDetailTabs + RegistrationDrawerTabShell → SceContextTabs or documented exemptions.",
    patterns: ["FULL_PAGE_WORKFLOW"],
    dependencies: ["SCE-UI-ROLLOUT-01B", "SCE-CONTEXT-TABS-STANDARD"],
    risks: ["URL churn for person deep links"],
    priority: 2,
  },
  {
    id: "SCE-UX-01E",
    title: "Canonical entity selection enforcement",
    scope:
      "Extend sce-selector-inventory: flag free-text ID fields; migrate TaskContextField to SceListSelector where context entity is canonical.",
    patterns: ["MODAL_DECISION", "FULL_PAGE_WORKFLOW"],
    dependencies: ["docs/ux/sce-selector-inventory.md", "SceListSelectorPanel"],
    risks: ["API discover coverage gaps for rare context types"],
    priority: 2,
  },
  {
    id: "SCE-UX-01F",
    title: "Club Development 2.0 hub workspace shell",
    scope:
      "Replace demo club-entwicklung KPI page with SceWorkspaceChrome hub linking Targets/Initiatives/Processes — no new business logic.",
    patterns: ["FULL_PAGE_WORKFLOW"],
    dependencies: ["SCE-UX-01A", "SCE-NAV-IA-V2-01 local group club-entwicklung"],
    risks: ["Scope creep into process engine"],
    priority: 3,
  },
];

export const SCE_UX_01_RECOMMENDED_FIRST_PACKAGE_ID = "SCE-UX-01A" as const;

export const SCE_UX_01_REUSABLE_PRIMITIVES = [
  "components/ui/Dialog.tsx",
  "components/ui/Sheet.tsx",
  "components/ui/SceModalOverlay.tsx",
  "components/sce/activity-composer/SceActivityComposer.tsx",
  "components/sce/context-tabs/SceContextTabs.tsx",
  "components/sce/page/SceInlineEditor.tsx",
  "components/sce/page/SceExpandablePanel.tsx",
  "components/sce/club-team-selector/SceClubTeamSelectorDialog.tsx",
  "components/sce/actions/SceConfirmDialog.tsx",
  "lib/design-system/sce-create-flow-foundation.ts",
  "lib/design-system/sce-ds2-06-modal-migration-inventory.ts",
] as const;
