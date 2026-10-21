/**
 * SCE Design System v1.0 — machine-readable governance manifest (DS-11).
 * Encodes canonical rules; does not duplicate visual token definitions in CSS.
 */

import { SCE_CREATE_FLOW_LOCKS } from "@/lib/design-system/sce-create-flow-foundation";
import { SCE_DENSITY_BORDER_SYSTEM_LOCKS } from "@/lib/design-system/sce-density-border-foundation";
import { SCE_DENSE_SELECTION_CONTRACT } from "@/lib/design-system/sce-dense-ui-foundation";
import { SCE_DESIGN_SYSTEM_09_GOVERNANCE } from "@/lib/design-system/sce-design-system-09-meta";
import { SCE_DESIGN_SYSTEM_10_ORG_BUILDER_FINAL } from "@/lib/design-system/sce-design-system-10-closure-meta";
import { SCE_WORKSPACE_PRODUCT_WIDE_FLAGS } from "@/lib/design-system/sce-workspace-hierarchy";
import { SCE_ACTIONABLE_ERROR_CONTRACT } from "@/lib/design-system/sce-feedback-status-foundation";

export const SCE_DESIGN_SYSTEM_CANONICAL_MASTER =
  "docs/design/SCE-DESIGN-SYSTEM.md" as const;

export const SCE_DESIGN_SYSTEM_GOVERNANCE_LOCKS = {
  SCE_DESIGN_SYSTEM_GOVERNANCE_ENABLED: "YES",
  DESIGN_SYSTEM_CANONICAL_MASTER: SCE_DESIGN_SYSTEM_CANONICAL_MASTER,
  DESIGN_SYSTEM_MACHINE_READABLE_GOVERNANCE: "YES",
  NEW_MODULES_MUST_DECLARE_DS_COMPLIANCE: "YES",
  LOCAL_PARALLEL_DESIGN_SYSTEMS_ALLOWED: "NO",
  DOMAIN_SPECIFIC_COMPOSITION_ALLOWED: "YES",
  DOMAIN_SPECIFIC_DESIGN_SYSTEM_REDEFINITION_ALLOWED: "NO",
  EXCEPTIONS_REQUIRE_EXPLICIT_CLASSIFICATION: "YES",
  SILENT_DESIGN_SYSTEM_EXCEPTIONS_ALLOWED: "NO",
  UNCLASSIFIED_EXCEPTION_ALLOWED: "NO",
  EXCEPTION_REASON_REQUIRED: "YES",
  ...SCE_CREATE_FLOW_LOCKS,
  ...SCE_DENSITY_BORDER_SYSTEM_LOCKS,
  ...SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
  BINARY_SETTING_CHECKBOX_ALLOWED: SCE_DENSE_SELECTION_CONTRACT.BINARY_SETTING_CHECKBOX_ALLOWED,
  MULTI_SELECTION_CHECKBOX_ALLOWED: "YES",
  ROW_SELECTION_CHECKBOX_ALLOWED_WHEN_MULTI_SELECTION: "YES",
  LOCAL_SWITCH_IMPLEMENTATIONS_ALLOWED: "NO",
  Z_INDEX_SYSTEM_CANONICAL: "YES",
  LOCAL_MAGIC_Z_INDEX_IN_CANONICAL_SCE_COMPONENTS_ALLOWED: "NO",
  DENSE_UI_PAGE_HORIZONTAL_OVERFLOW: "NO",
  HORIZONTAL_PAGE_OVERFLOW_ALLOWED: "NO",
  CONTAINED_TABLE_SCROLL_ALLOWED_WHEN_SEMANTIC: "YES",
  COMMUNICATION_IS_UNIVERSAL_LAYOUT_TEMPLATE: "NO",
  COMMUNICATION_VISUAL_REFERENCE: "YES",
} as const;

/** Stable automated rule ids surfaced in CI / CLI output. */
export const SCE_DESIGN_SYSTEM_GOVERNANCE_RULES = {
  "SCE-DS-GOV-CONTROL-001": {
    id: "SCE-DS-GOV-CONTROL-001",
    domain: "controls",
    summary: "Binary ON/OFF settings must not use new raw checkboxes outside the DS-10 baseline allowlist.",
    suggestion: "Use SwitchToggle / SwitchThumb from components/ui/SwitchToggle.tsx.",
  },
  "SCE-DS-GOV-CONTROL-002": {
    id: "SCE-DS-GOV-CONTROL-002",
    domain: "controls",
    summary: "Binary setting rows must not pair checkboxes with data-sce-binary-setting-row.",
    suggestion: "Use SwitchToggle with data-sce-binary-setting-row on the row wrapper.",
  },
  "SCE-DS-GOV-CREATE-001": {
    id: "SCE-DS-GOV-CREATE-001",
    domain: "create-flow",
    summary:
      "Modal-first admin workspaces must expose primary create via data-sce-create-flow=\"modal\".",
    suggestion: "Add a Create*Trigger with data-sce-create-flow=\"modal\" on the list workspace.",
  },
  "SCE-DS-GOV-SURFACE-001": {
    id: "SCE-DS-GOV-SURFACE-001",
    domain: "surface",
    summary: "Canonical SCE workspace primitives must not regress to raw light functional panels.",
    suggestion: "Use SCE_FUNCTIONAL_PANEL_CLASS / var(--surface) hierarchy from sce-functional-surface-styles.ts.",
  },
  "SCE-DS-GOV-WORKSPACE-001": {
    id: "SCE-DS-GOV-WORKSPACE-001",
    domain: "workspace",
    summary: "Removed parallel admin shell patterns must not reappear.",
    suggestion: "Use SceWorkspaceChrome and documented workspace hierarchy.",
  },
  "SCE-DS-GOV-ACTIVITY-001": {
    id: "SCE-DS-GOV-ACTIVITY-001",
    domain: "activity",
    summary: "Activity presentation must not import deprecated parallel match card implementations.",
    suggestion: "Use SceMatchCard / SceTrainingCard / SceTrainingCard / SceClubEventCard family.",
  },
  "SCE-DS-GOV-LAYER-001": {
    id: "SCE-DS-GOV-LAYER-001",
    domain: "layer",
    summary: "Canonical SCE components must not use unexplained arbitrary z-index utilities.",
    suggestion: "Use lib/ui/sce-overlay-layering.ts tokens or sce-* layer classes from globals.css.",
  },
  "SCE-DS-GOV-A11Y-001": {
    id: "SCE-DS-GOV-A11Y-001",
    domain: "accessibility",
    summary: "Organisation Builder contextual preview must retain WCAG 1.4.13 hover/focus contract markers.",
    suggestion: "Preserve data-org-contextual-preview* markers and preview dismissal handlers.",
  },
  "SCE-DS-GOV-SECURITY-001": {
    id: "SCE-DS-GOV-SECURITY-001",
    domain: "security",
    summary: "Governance/seeds/tests must not mutate existing user passwords outside password-management flows.",
    suggestion: "Use dedicated password-management operations only; never log plaintext credentials.",
  },
  "SCE-DS-GOV-ERROR-001": {
    id: "SCE-DS-GOV-ERROR-001",
    domain: "feedback",
    summary: "New canonical flows must not normalize generic Interner Fehler when actionable errors exist.",
    suggestion: "Follow sce-actionable-error-foundation.ts domain-aware failure copy.",
  },
} as const;

export type SceDesignSystemGovernanceRuleId = keyof typeof SCE_DESIGN_SYSTEM_GOVERNANCE_RULES;

/** Post-DS-10 clean baseline — checkbox occurrences limited to these production paths. */
export const SCE_GOVERNANCE_CHECKBOX_BASELINE_PATHS = [
  "components/design-system/icons/specimen/SceIconSpecimen.tsx",
  "components/infoboard/v2/designer/anlageplan/AnlageplanDesignerClient.tsx",
  "components/sce/forms/SceCheckbox.tsx",
  "components/admin/teams/communication/TeamFormalCommunicationComposer.tsx",
  "components/admin/teams/registration/StepPublication.tsx",
  "components/admin/teams/registration/StepSeasonAndOrgUnit.tsx",
  "components/admin/matchcenter/SpieleManagementMatchRow.tsx",
  "components/admin/registrations/RegistrationInbox.tsx",
  "components/admin/workspace/WorkspaceListViewOptions.tsx",
  "components/admin/communication/inbox/CommunicationInboxConversationList.tsx",
  "components/admin/communication/club/ClubCommunicationComposer.tsx",
  "components/admin/communication/kampagnen/KampagnenListToolbar.tsx",
  "components/admin/persons/PersonCreateSheet.tsx",
  "components/admin/persons/PersonAccessRolesCard.tsx",
  "components/admin/communication/vorlagen/VorlageManagementForm.tsx",
  "components/admin/communication/audience/CommunicationAudienceSelector.tsx",
  "components/admin/communication/campaign/CampaignComposer.tsx",
  "components/admin/seasons/TeamRolloverPanel.tsx",
  "components/admin/planning-hub/AggregatedActivityInspectionDialog.tsx",
  "components/admin/planning-hub/PlanningHubManipulationResourceAvailabilityBoard.tsx",
  "components/admin/users/people-access/PeopleAccessWizard.tsx",
  "components/admin/users/AddPersonAccessFlow.tsx",
  "components/admin/users/UserRolesForm.tsx",
  "components/admin/roles/RoleAssignmentPanel.tsx",
  "components/admin/roles/RolePermissionEditor.tsx",
] as const;

/** Documented modal-first deep-link /new fallbacks (DS-10 closure baseline — not primary create UX). */
export const SCE_GOVERNANCE_DEEP_LINK_CREATE_ROUTES = [
  "app/(admin)/dashboard/admin/commercial/billing/contracts/new/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/customers/new/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/invoices/new/page.tsx",
  "app/(admin)/dashboard/admin/commercial/billing/settings/legal-entities/new/page.tsx",
  "app/(admin)/dashboard/admin/people-access/new/page.tsx",
  "app/(admin)/dashboard/admin/tenants/new/page.tsx",
  "app/(admin)/dashboard/admin/users/new/page.tsx",
  "app/(admin)/dashboard/administration/roles/new/page.tsx",
  "app/(admin)/dashboard/communication/inbox/new/page.tsx",
  "app/(admin)/dashboard/communication/kampagnen/new/page.tsx",
  "app/(admin)/dashboard/communication/mitteilungen/new/page.tsx",
  "app/(admin)/dashboard/communication/vorlagen/new/page.tsx",
  "app/(admin)/dashboard/communication/zielgruppen/new/page.tsx",
  "app/(admin)/dashboard/events/matches/new/page.tsx",
  "app/(admin)/dashboard/events/other/new/page.tsx",
  "app/(admin)/dashboard/events/tournaments/new/page.tsx",
  "app/(admin)/dashboard/events/trainings/new/page.tsx",
  "app/(admin)/dashboard/matchcenter/new/page.tsx",
  "app/(admin)/dashboard/org-units/new/page.tsx",
  "app/(admin)/dashboard/persons/new/page.tsx",
  "app/(admin)/dashboard/target-groups/new/page.tsx",
  "app/(admin)/dashboard/teams/new/page.tsx",
  "app/(admin)/dashboard/tournamentcenter/new/page.tsx",
  "app/(admin)/dashboard/training/new/page.tsx",
  "app/(admin)/dashboard/users/new/page.tsx",
  "app/(admin)/dashboard/veranstaltungen/new/page.tsx",
  "app/(admin)/dashboard/vereine/[clubId]/teams/new/page.tsx",
  "app/(admin)/dashboard/vereine/new/page.tsx",
  "app/(admin)/dashboard/website/components/new/page.tsx",
  "app/(admin)/dashboard/website/news/new/page.tsx",
  "app/(admin)/dashboard/website/pages/new/page.tsx",
] as const;

/** Activity composer routes — /new is canonical (not modal-first CRUD debt). */
export const SCE_GOVERNANCE_ACTIVITY_COMPOSER_ROUTE_PREFIXES = [
  "app/(admin)/dashboard/training/new/",
  "app/(admin)/dashboard/matchcenter/new/",
  "app/(admin)/dashboard/veranstaltungen/new/",
  "app/(admin)/dashboard/tournamentcenter/new/",
  "app/(admin)/dashboard/planner/new/",
] as const;

export const SCE_GOVERNANCE_CANONICAL_ACTIVITY_CARD_PATHS = [
  "components/sporting-activity/SceMatchCard.tsx",
  "components/sporting-activity/SceTrainingCard.tsx",
  "components/sporting-activity/SceTournamentCard.tsx",
  "components/sporting-activity/SceClubEventCard.tsx",
] as const;

export const SCE_ACTIVITY_SEMANTICS_GOVERNANCE = {
  MATCH: { label: "SPIEL", pill: "match-red" },
  TRAINING: { label: "TRAINING", pill: "training-blue" },
  TOURNAMENT: { label: "TURNIER", pill: "tournament-orange" },
  CLUB_EVENT: { label: "VERANSTALTUNG", pill: "club-event-violet" },
} as const;

export const SCE_ORGANISATION_BUILDER_GOVERNANCE = {
  ...SCE_DESIGN_SYSTEM_10_ORG_BUILDER_FINAL,
  ORG_EDITOR_DEDICATED_PLANE: "YES",
  ORG_EDITOR_SPATIAL_GRID: "YES",
  VISUAL_POSITION_DRAG_MUTATES_HIERARCHY: "NO",
  STRUCTURAL_REPARENT_EXPLICIT: "YES",
  STRUCTURAL_REPARENT_CONFIRMATION: "YES",
  REPARENT_ACCESSIBLE_ALTERNATIVE: "YES",
  ORG_DELETE_SILENT_DESCENDANT_DELETE: "NO",
  ORG_DELETE_DEPENDENCY_AWARE: "YES",
  ORG_NODE_PURPOSE: "SPATIAL_ORIENTATION",
  ORG_INSPECTOR_PRIMARY_CONTENT: "PEOPLE_AND_STRUCTURE",
  SELECTED_NODE_PREVIEW_DUPLICATION: "NO",
  ORG_HISTORY_SESSION_SCOPED: "YES",
  UNDO_PRESENTATION_USES_LOCAL_HISTORY: "YES",
  UNDO_AUTHORITATIVE_USES_SERVER_MUTATION: "YES",
  UNDO_CLIENT_ONLY_FOR_AUTHORITATIVE_DATA: "NO",
} as const;

export const SCE_FACILITY_RESOURCE_INTEGRITY_GOVERNANCE = {
  FACILITY_RESOURCE_INTEGRITY_GOVERNANCE: "YES",
  PITCH_RESOURCE_LIFECYCLE_COVERED: "YES",
  DRESSING_ROOM_RESOURCE_LIFECYCLE_COVERED: "YES",
  scopeRoute: "/dashboard/admin/facilities",
  downstreamConsumers: [
    "Wochenplaner",
    "Trainings",
    "Matches",
    "Turniere",
    "Club-Veranstaltungen",
    "allocations",
    "conflict detection",
    "availability",
    "hierarchy / labels",
    "relevant caches / read models",
  ],
  lifecycleEvents: ["add", "edit", "rename", "deactivate", "delete"],
} as const;

export const SCE_PASSWORD_MUTATION_GOVERNANCE = {
  PASSWORD_MUTATION_GOVERNANCE: "YES",
  rule:
    "Development, migrations, seeds, previews, tests, bootstrap and unrelated feature packages must NEVER mutate an existing user's password.",
} as const;

export const SCE_DESIGN_SYSTEM_DEVELOPER_GUIDANCE = {
  governanceCommand: "npm run test:design-system",
  complianceFooterFields: [
    "SCE_DESIGN_SYSTEM_COMPLIANCE",
    "BINARY_CONTROL_COMPLIANCE",
    "NEW_BINARY_CHECKBOXES",
    "CANONICAL_TOGGLES_USED",
    "MULTI_SELECTION_PATTERN",
  ] as const,
  actionableErrorFoundation: SCE_ACTIONABLE_ERROR_CONTRACT,
  responsiveGovernance: SCE_DESIGN_SYSTEM_09_GOVERNANCE,
} as const;
