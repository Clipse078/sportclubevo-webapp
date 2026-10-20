/**
 * DS-05 re-audit of checkbox semantics (STAGE baseline + DS-05 migrations).
 * Counts are source-level `type="checkbox"` occurrences in production `.tsx`
 * (excludes tests and icon specimen).
 */

export const SCE_BINARY_CHECKBOX_AUDIT_SCOPE = {
  CHECKBOX_OCCURRENCES_AUDITED: 64,
  AUDIT_METHOD:
    "ripgrep type=\"checkbox\" in *.tsx excluding __tests__ and *.test.* after DS-05 migrations",
  DS01_ESTIMATE_BINARY_SETTINGS: 32,
  DS05_REAUDIT_NOTE:
    "DS-01 ~32 binary-setting estimate was approximate; DS-05 re-audit distinguishes semantics.",
} as const;

export const SCE_BINARY_CHECKBOX_SEMANTICS = {
  A_BINARY_SETTING_ON_OFF: "BINARY_SETTING",
  B_MULTI_SELECTION: "MULTI_SELECTION",
  C_ROW_SELECTION: "ROW_SELECTION",
  D_ACKNOWLEDGEMENT_CONSENT: "ACKNOWLEDGEMENT",
  E_OTHER: "OTHER",
} as const;

/** Post-DS-05 migration inventory (remaining binary settings deferred to DS-10). */
export const SCE_BINARY_CHECKBOX_COUNTS = {
  BINARY_SETTING_CHECKBOXES_FOUND: 31,
  BINARY_SETTING_CHECKBOXES_MIGRATED_DS05: 14,
  BINARY_SETTING_CHECKBOXES_DEFERRED: 17,
  LEGITIMATE_MULTI_SELECTION_CHECKBOXES: 22,
  LEGITIMATE_ROW_SELECTION_CHECKBOXES: 7,
  LEGITIMATE_ACKNOWLEDGEMENT_CHECKBOXES: 2,
} as const;

export type SceBinaryCheckboxAuditRow = {
  file: string;
  semantics: keyof typeof SCE_BINARY_CHECKBOX_SEMANTICS;
  ds05Action: "MIGRATED_DS05" | "DEFER_DS10" | "LEGITIMATE_UNCHANGED" | "AUDIT_ONLY";
  notes: string;
};

/** Representative rows — full product inventory in SCE-DESIGN-SYSTEM-05-FORM-CONTROL-INVENTORY.md */
export const SCE_BINARY_CHECKBOX_AUDIT_SAMPLE: SceBinaryCheckboxAuditRow[] = [
  {
    file: "components/admin/planner/PlannerEntryCreateForm.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "Publication flags → PlannerEntryCreatePublicationFields + SwitchThumb",
  },
  {
    file: "components/admin/notifications/NotificationPreferencesSection.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "In-App / E-Mail channels → SwitchThumb",
  },
  {
    file: "components/admin/communication/preferences/CommunicationPreferencesSection.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "Preference channels → SwitchThumb",
  },
  {
    file: "components/admin/communication/personal-signature/PersonalSignatureWorkspace.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "useByDefault → SwitchToggle",
  },
  {
    file: "components/admin/communication/personal-signature/PersonalSignatureComposerField.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "Include signature → SwitchThumb",
  },
  {
    file: "components/admin/reusable-components/config-forms/SponsorBannerConfigForm.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "Click tracking → SwitchToggle",
  },
  {
    file: "components/admin/cms/LayoutConfigPanel.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "Responsive layout flags → SwitchThumb rows",
  },
  {
    file: "components/admin/competitions/CompetitionsSearchBar.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "Include archived filter → SwitchToggle; search → SceSearchField",
  },
  {
    file: "components/admin/workspace/WorkspaceListViewOptions.tsx",
    semantics: "B_MULTI_SELECTION",
    ds05Action: "LEGITIMATE_UNCHANGED",
    notes: "Column visibility — multi-select",
  },
  {
    file: "components/admin/communication/inbox/CommunicationInboxConversationList.tsx",
    semantics: "C_ROW_SELECTION",
    ds05Action: "LEGITIMATE_UNCHANGED",
    notes: "Bulk conversation selection",
  },
  {
    file: "components/admin/roles/RolePermissionEditor.tsx",
    semantics: "B_MULTI_SELECTION",
    ds05Action: "DEFER_DS10",
    notes: "Permission matrix — multi-capability selection",
  },
  {
    file: "components/admin/planner/PlannerEntryCreateForm.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "See publication fields client wrapper",
  },
  {
    file: "components/admin/events/TrainingEventCreateForm.tsx",
    semantics: "A_BINARY_SETTING_ON_OFF",
    ds05Action: "MIGRATED_DS05",
    notes: "Serientermin + publication flags → SwitchThumb (DS-10 sweep)",
  },
  {
    file: "components/admin/communication/campaign/CampaignComposer.tsx",
    semantics: "B_MULTI_SELECTION",
    ds05Action: "AUDIT_ONLY",
    notes: "Mix: audience multi-select + channel toggles — audit per field",
  },
];
