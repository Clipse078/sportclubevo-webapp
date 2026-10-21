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
    classification: "VALID_FULL_PAGE_EXCEPTION",
    ds09Action: "EXCEPTION_DOCUMENTED",
    canonicalEntry: "CreateTenantRoleForm (3-step permission matrix)",
    notes: "Complex multi-step workspace — full page remains default entry via /new until DS-10 composer review",
  },
  {
    entity: "Neue Mitteilung",
    route: "/dashboard/communication/mitteilungen/new",
    classification: "VALID_FULL_PAGE_EXCEPTION",
    ds09Action: "DEFER_DS10",
    canonicalEntry: "Mitteilung composer workspace",
    notes: "Long-form composition — modal-first where sub-flows allow",
  },
  {
    entity: "Neue Kampagne",
    route: "/dashboard/communication/kampagnen/new",
    classification: "VALID_FULL_PAGE_EXCEPTION",
    ds09Action: "DEFER_DS10",
    canonicalEntry: "Campaign composer workspace",
    notes: "Multi-step campaign builder",
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

/** Documented full-page exceptions — not modal-first debt. */
export const SCE_CREATE_FLOW_DS10_VALID_EXCEPTIONS = [
  "Neue Rolle — multi-step permission matrix (CreateTenantRoleForm)",
  "Neue Mitteilung — long-form composer workspace",
  "Neue Kampagne — multi-step campaign builder",
] as const;

export const SCE_CREATE_FLOW_DS10_DEBT = [] as const;
