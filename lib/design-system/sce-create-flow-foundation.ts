/**
 * SCE-DESIGN-SYSTEM-09 — modal-first entity creation contracts.
 */

export const SCE_CREATE_FLOW_LOCKS = {
  CREATE_FLOW_MODAL_FIRST: "YES",
  CREATE_FLOW_FULL_PAGE_DEFAULT: "NO",
  CREATE_CONTEXT_PRESERVATION_REQUIRED: "YES",
  CREATE_MODAL_CANONICAL_SCE_DIALOG_REQUIRED: "YES",
  CREATE_MODAL_MOBILE_FULLSCREEN_WHERE_NEEDED: "YES",
  MODAL_TO_MODAL_DEFAULT: "NO",
} as const;

export type SceCreateFlowClassification =
  | "MODAL_FIRST_DS09"
  | "VALID_FULL_PAGE_EXCEPTION"
  | "FULL_PAGE_ROUTE_DEEP_LINK_ONLY"
  | "INLINE_LEGACY_DS10";

export type SceCreateFlowAuditRow = {
  entity: string;
  route: string;
  classification: SceCreateFlowClassification;
  ds09Action: "ADOPTED_MODAL" | "EXCEPTION_DOCUMENTED" | "DEEP_LINK_RETAINED" | "DEFER_DS10";
  canonicalEntry: string;
  notes: string;
};

export const SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT: SceCreateFlowAuditRow[] = [
  {
    entity: "Neue Zielgruppe",
    route: "/dashboard/communication/zielgruppen/new",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "ZielgruppeCreateComposerDialog on list workspace",
    notes: "/new retained for deep links",
  },
  {
    entity: "Person hinzufügen",
    route: "/dashboard/admin/people-access/new",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "PeopleAccessWizardDialog",
    notes: "Already canonical on People & Access workspace",
  },
  {
    entity: "Neue Saison",
    route: "/dashboard/seasons",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "CreateSeasonComposerDialog",
    notes: "Server action form inside Dialog",
  },
  {
    entity: "Neue Rolle",
    route: "/dashboard/administration/roles/new",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "CreateTenantRoleComposerDialog (workspace modal)",
    notes: "/new retained for deep links — same CreateTenantRoleForm",
  },
  {
    entity: "Neue Mitteilung",
    route: "/dashboard/communication/mitteilungen/new",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "MitteilungCreateComposerDialog",
    notes: "ClubCommunicationComposer in workspace dialog",
  },
  {
    entity: "Neue Kampagne",
    route: "/dashboard/communication/kampagnen/new",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "KampagneCreateComposerDialog",
    notes: "CampaignComposer in workspace dialog",
  },
  {
    entity: "Neue Organisationseinheit",
    route: "/dashboard/org-units/new",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "OrgUnitCreateComposerDialog on Organisation Builder",
    notes: "Canvas + list share OrgUnitForm",
  },
  {
    entity: "Neues Ziel",
    route: "/vereinsleitung/targets/new",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "CreateTargetComposerDialog",
    notes: "Dark composer surfaces on fallback /new",
  },
  {
    entity: "Neue Initiative",
    route: "/vereinsleitung/initiativen/new",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "CreateInitiativeComposerDialog",
    notes: "Fallback route uses layout=composer",
  },
  {
    entity: "Neues Meeting",
    route: "/vereinsleitung/meetings/new",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "CreateMeetingComposerDialog",
    notes: "Fallback route uses layout=composer",
  },
  {
    entity: "Anlage erstellen",
    route: "/dashboard/admin/facilities",
    classification: "MODAL_FIRST_DS09",
    ds09Action: "ADOPTED_MODAL",
    canonicalEntry: "CreateFacilityComposerDialog on facilities workspace",
    notes: "Inline expand retired — canonical Dialog composer (DS-10)",
  },
];

/** Documented full-page exceptions — not modal-first debt (empty after DS-10R1 re-audit). */
export const SCE_CREATE_FLOW_DS10_VALID_EXCEPTIONS = [] as const;

export const SCE_CREATE_FLOW_DS10_DEBT = [] as const;
