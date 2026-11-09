/**
 * SCE-DS2-06 modal / dialog migration inventory (authenticated admin).
 * Classifications: inline | accordion | side-panel | retain
 */

export type SceDs206ModalMigrationClass =
  | "inline-expandable"
  | "accordion"
  | "contextual-side-panel"
  | "retain-modal";

export type SceDs206ModalInventoryEntry = {
  id: string;
  surface: string;
  classification: SceDs206ModalMigrationClass;
  justification: string;
};

export const SCE_DS2_06_MODAL_MIGRATION_INVENTORY: SceDs206ModalInventoryEntry[] = [
  {
    id: "wochenplaner-canonical-edit",
    surface: "WeekplannerPlanningSheet / WeekplannerActivityEditorSheet",
    classification: "contextual-side-panel",
    justification: "Complex planning fields; migrated to light contextual Sheet (not centered modal).",
  },
  {
    id: "wochenplaner-operational-edit",
    surface: "WeekplannerOperationalPlanningSheet",
    classification: "contextual-side-panel",
    justification: "Alternative-plan overrides need space; contextual side panel preserves grid context.",
  },
  {
    id: "planning-hub-conflicts",
    surface: "PlanningHubConflictWorkspaceDialog",
    classification: "retain-modal",
    justification: "Cross-activity conflict workspace; destructive batch actions; needs focused modal scope.",
  },
  {
    id: "finance-scenario-governance",
    surface: "FinanceScenarioGovernanceDialogs",
    classification: "retain-modal",
    justification: "Security-sensitive governance approvals.",
  },
  {
    id: "sce-confirm-destructive",
    surface: "SceConfirmDialog",
    classification: "retain-modal",
    justification: "Destructive confirmation pattern — explicit user intent required.",
  },
  {
    id: "facilities-inline-edit",
    surface: "FacilitiesAdminPanel InlineEditForm",
    classification: "inline-expandable",
    justification: "Existing inline pattern; reference for registry rows.",
  },
  {
    id: "match-operational-details",
    surface: "SceMatchCardCollapsibleOperationalDetails",
    classification: "accordion",
    justification: "Progressive disclosure of operational metadata on cards.",
  },
];

export const SCE_DS2_06_RETAINED_MODALS = SCE_DS2_06_MODAL_MIGRATION_INVENTORY.filter(
  (e) => e.classification === "retain-modal",
);

export const SCE_DS2_06_INLINE_EDITORS = SCE_DS2_06_MODAL_MIGRATION_INVENTORY.filter(
  (e) => e.classification === "inline-expandable" || e.classification === "contextual-side-panel",
);
