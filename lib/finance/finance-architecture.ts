/**
 * SCE Finance — pure architecture contracts (FIN-01A / FIN-01A-R1).
 *
 * No Prisma, React, or persistence. Target model for FIN-01B+ implementation.
 *
 * Core principle: SCE provides the financial engine; the organisation builds its
 * financial structure. Canonical financial semantics; configurable organisational semantics.
 */

import { FINANCE_AMOUNT_STORAGE } from "./money-types";

/** Global product locks (FIN-01A-R1). */
export const SCE_FINANCE_PRODUCT_LOCKS = {
  sportAgnostic: true,
  countryAgnosticCore: true,
  organisationAgnostic: true,
  multiTenantConfigurable: true,
  fcaReferenceIsProductSchema: false,
  footballSpecificFinanceCore: false,
  swissSpecificFinanceCore: false,
  teamRequiredForFinance: false,
  orgUnitRequiredForFinance: false,
  eventRequiredForFinance: false,
  sportingSeasonRequiredForFinance: false,
  canonicalFinancialSemantics: true,
  configurableOrganisationalSemantics: true,
  tenantFinanceStructureUserManaged: true,
  productDeploymentRequiredForTenantFinanceStructureChange: false,
} as const;

/** Organisation operational / management finance — not statutory accounting (ADR-016). */
export const SCE_FINANCE_IS_ORGANISATION_FINANCIAL_OPERATING_SYSTEM = true;
/** @deprecated Use SCE_FINANCE_IS_ORGANISATION_FINANCIAL_OPERATING_SYSTEM — alias for FIN-01A readers */
export const SCE_FINANCE_IS_CLUB_FINANCIAL_OPERATING_SYSTEM =
  SCE_FINANCE_IS_ORGANISATION_FINANCIAL_OPERATING_SYSTEM;

export const SCE_FINANCE_IS_FULL_ACCOUNTING_SYSTEM_V1 = false;

export const FINANCE_V1_BOUNDARY = {
  managementIncomeStatementRequired: true,
  /** Swiss Erfolgsrechnung is a supported localization layout — not a global product requirement. */
  swissErfolgsrechnungSupported: true,
  swissErfolgsrechnungRequiredGlobally: false,
  balanceSheetAwareArchitecture: true,
  fullGeneralLedgerV1: false,
  fullBalanceSheetV1: false,
  vatAccountingV1: false,
  payrollAccountingV1: false,
  bankReconciliationV1: false,
  accountingIntegrationArchitectureRequired: true,
} as const;

/** Sporting season and finance year are related, not identical (ADR-018). */
export const SEASON_EQUALS_FINANCE_YEAR = false;
export const FINANCIAL_YEAR_CONFIGURABLE = true;
export const SPORTING_SEASON_OPTIONAL = true;

/** Finance references canonical SCE domain rows — no parallel Team/OrgUnit/Person tables. */
export const FINANCE_DUPLICATE_DOMAIN_ENTITIES = false;

/** Optional typed links to authoritative SCE domain entities (none required for finance). */
export const FINANCE_CANONICAL_DOMAIN_REFERENCES = {
  tenant: "Tenant",
  season: "Season",
  orgUnit: "OrgUnit",
  team: "Team",
  person: "Person",
  clubEvent: "Event (type=OTHER)",
  match: "Event (type=MATCH)",
  tournament: "Event (type=TOURNAMENT)",
  sponsorOrganisation: "SponsorOrganisation",
  facilityResource: "FacilityResource",
  personMembership: "PersonMembership",
  personAssignment: "PersonAssignment",
} as const;

/** Native billing / invoices are commercial counterparty flows — separate product boundary. */
export const CLUB_FINANCE_VS_PLATFORM_BILLING = {
  organisationFinanceScope:
    "Management planning, budgets, income statement, operational intelligence",
  platformBillingScope:
    "LegalEntity, BillingCustomer, Invoice, payment rails — membership/commercial invoicing",
  integrationDirection:
    "Future export / mapping from management finance actuals to invoice lines — not FIN-01",
} as const;

export const FINANCIAL_MEASURE_KINDS = [
  "BUDGET",
  "ACTUAL",
  "FORECAST",
  "COMMITMENT",
] as const;

export type FinancialMeasureKind = (typeof FINANCIAL_MEASURE_KINDS)[number];

/** Approved baseline budgets are not silently mutable (ADR-019). */
export const BUDGET_VERSION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "LOCKED",
] as const;

export type BudgetVersionStatus = (typeof BUDGET_VERSION_STATUSES)[number];

export const APPROVED_BUDGET_VERSION_IMMUTABLE = true;

/**
 * Canonical scenario semantics — not tenant-facing scenario names (ADR-019, ADR-027).
 * Tenants name scenarios freely; at most one active baseline semantic per budget container.
 */
export const BUDGET_SCENARIO_CANONICAL_SEMANTICS = [
  "BASELINE",
  "COMPARISON",
] as const;

export type BudgetScenarioCanonicalSemantic =
  (typeof BUDGET_SCENARIO_CANONICAL_SEMANTICS)[number];

export const SCENARIO_MODEL = {
  tenantCanCreateBudgetScenarios: true,
  tenantCanNameBudgetScenarios: true,
  tenantCanRenameBudgetScenarios: true,
  hardcodedScenarioTypes: false,
  displayNameIsTenantData: true,
  optionalCanonicalSemantic: true,
} as const;

/** Minimum typed account/posting semantics for reporting and future accounting seams. */
export const CANONICAL_ACCOUNT_SEMANTICS = [
  "INCOME",
  "EXPENSE",
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "TRANSFER",
  "OTHER",
] as const;

export type CanonicalAccountSemantic = (typeof CANONICAL_ACCOUNT_SEMANTICS)[number];

export const TYPED_FINANCIAL_SEMANTICS = {
  untypedFinancialCore: false,
  labelsAreConfigurable: true,
  financialSemanticsAreTyped: true,
} as const;

/** Management income statement (localized: P&L, Erfolgsrechnung, Statement of Activities, …). */
export const MANAGEMENT_INCOME_STATEMENT_MODEL = {
  enabled: true,
  primarySemanticsForV1: ["INCOME", "EXPENSE"] as const satisfies readonly CanonicalAccountSemantic[],
  computedLineKinds: [
    "TOTAL_INCOME",
    "TOTAL_EXPENSE",
    "OPERATING_SURPLUS_DEFICIT",
    "NET_SURPLUS_DEFICIT",
  ] as const,
} as const;

export type ManagementIncomeStatementComputedLineKind =
  (typeof MANAGEMENT_INCOME_STATEMENT_MODEL.computedLineKinds)[number];

export const VARIANCE_MEASURES = ["ABSOLUTE", "PERCENT"] as const;

/**
 * Typed optional domain dimensions (ADR-017). No dimension kind is required on a posting.
 * Custom tenant-defined dimensions use FinanceCustomDimensionDefinition (future schema).
 */
export const FINANCE_TYPED_DOMAIN_DIMENSION_KINDS = [
  "SEASON",
  "ORG_UNIT",
  "TEAM_OR_GROUP",
  "PERSON",
  "ACTIVITY",
  "CLUB_EVENT",
  "TOURNAMENT",
  "MATCH",
  "SPONSOR_ORGANISATION",
  "FINANCE_PROJECT",
  "FACILITY_RESOURCE",
  "FUND",
  "FUNDING_SOURCE",
  "FINANCE_COST_CENTER",
] as const;

export type FinanceTypedDomainDimensionKind =
  (typeof FINANCE_TYPED_DOMAIN_DIMENSION_KINDS)[number];

/** @deprecated Prefer FINANCE_TYPED_DOMAIN_DIMENSION_KINDS — TEAM renamed to TEAM_OR_GROUP in R1 */
export const FINANCE_DIMENSION_KINDS = FINANCE_TYPED_DOMAIN_DIMENSION_KINDS;

export type FinanceDimensionKind = FinanceTypedDomainDimensionKind;

export const FINANCIAL_DIMENSION_MODEL = {
  typedDomainDimensionsSupported: true,
  customDimensionsSupported: true,
  everythingIsUntypedCustomField: false,
  domainLinkOptional: true,
  assignmentCardinality: "one entity id per assignment row",
} as const;

export const FINANCE_CUSTOM_DIMENSION_MODEL = {
  entityDefinition: "FinanceCustomDimensionDefinition",
  entityValue: "FinanceCustomDimensionValue",
  examplesOnly: [
    "Region",
    "Department",
    "Program",
    "Competition",
    "Campaign",
    "Course",
    "Trip",
    "Branch",
    "Location",
  ],
} as const;

/**
 * Tenant-configurable cost center hierarchy (ADR-020, ADR-026).
 * Names are tenant data — no business logic on literal labels.
 */
export const COST_CENTER_MODEL = {
  entity: "FinanceCostCenter",
  hierarchyModel: "tenant scoped tree (parentId, sortOrder)",
  optionalLinks: [
    "orgUnitId",
    "teamId",
    "eventId",
    "tournamentId",
    "facilityResourceId",
    "financeProjectId",
    "parentCostCenterId",
  ],
  orgTreeIsNotAccountingTree: true,
  domainLinkOptional: true,
} as const;

export const COST_CENTER_HIERARCHY_CAPABILITIES = {
  tenantCanCreateCostCenters: true,
  tenantCanRenameCostCenters: true,
  tenantCanReparentCostCenters: true,
  tenantCanReorderCostCenters: true,
  tenantCanArchiveCostCenters: true,
  tenantCanReactivateCostCenters: true,
  tenantCanDeleteCostCentersWhenSafe: true,
} as const;

export const COST_CENTER_DELETE_INTEGRITY = {
  silentDelete: false,
  cascadeFinancialHistoryDelete: false,
  archivePreservesHistoricalReferences: true,
  dependencyAwareDeleteRequired: true,
  dependentEntityExamples: [
    "BudgetLine",
    "FinancialPosting",
    "Forecast",
    "Commitment",
    "Allocation",
    "Approval",
    "ImportMapping",
    "Receivable",
    "Payable",
  ],
} as const;

/** Account / category / reporting hierarchy — separate from cost center (ADR-032). */
export const ACCOUNT_HIERARCHY_MODEL = {
  entity: "FinancialAccount",
  nodeKinds: ["POSTING"] as const,
  accountsAreLeavesUnderReportingGroups: true,
  accountWithinAccountHierarchy: false,
  canonicalSemanticOnNode: true,
  displayLabelIsTenantData: true,
  reportingGroupEntity: "FinancialReportingGroup",
  tenantCanConfigureReportingStructure: true,
  hardcodedAccountStructure: false,
} as const;

/** Sport-independent finance project spanning years, cost centers, org slices (ADR-031). */
export const FINANCE_PROJECT_MODEL = {
  entity: "FinanceProject",
  sportIndependent: true,
  teamNotRequired: true,
  seasonNotRequired: true,
  eventNotRequired: true,
  maySpanMultipleFinanceYears: true,
  maySpanMultipleCostCenters: true,
  optionalLinks: [
    "orgUnitIds",
    "teamIds",
    "eventIds",
    "fundingSourceIds",
    "activityIds",
  ],
} as const;

/** Restricted / purpose-bound money (ADR-030). Provider names are tenant/localization data. */
export const FUND_AND_FUNDING_MODEL = {
  fundEntity: "FinanceFund",
  fundingSourceEntity: "FundingSource",
  restrictionEntity: "FinanceFundRestriction",
  restrictedFundingArchitecture: true,
  fundingSourceProviderAgnostic: true,
  hardcodedProvidersInCore: false,
} as const;

/** Economics metrics — canonical keys; localized labels (not hardcoded German in core). */
export const UNIT_ECONOMICS_CONCEPTS = [
  "CONTRIBUTION_MARGIN",
  "SUBSIDY_REQUIREMENT",
  "SELF_SUSTAINING",
] as const;

export type UnitEconomicsConcept = (typeof UNIT_ECONOMICS_CONCEPTS)[number];

/** Personnel compensation requires explicit finance permissions — not people.view (ADR-023). */
export const PERSONNEL_FINANCE_REQUIRES_EXPLICIT_PERMISSION = true;

export const FINANCE_PERSONNEL_PERMISSION_KEYS = {
  aggregateOrganisation: "finance.view",
  scopedAggregate: "finance.view",
  individualCompensation: "people.finance.view",
  manageIndividualCompensation: "people.finance.manage",
} as const;

export const PROPOSED_FINANCE_PERMISSION_KEYS = {
  FINANCE_VIEW: "finance.view",
  FINANCE_BUDGET_VIEW: "finance.budget.view",
  FINANCE_BUDGET_MANAGE: "finance.budget.manage",
  FINANCE_ACTUAL_VIEW: "finance.actual.view",
  FINANCE_ACTUAL_MANAGE: "finance.actual.manage",
  FINANCE_FORECAST_MANAGE: "finance.forecast.manage",
  FINANCE_PERSONNEL_VIEW: "finance.personnel.view",
  FINANCE_STRUCTURE_MANAGE: "finance.structure.manage",
  FINANCE_APPROVE: "finance.approve",
  FINANCE_ADMIN: "finance.admin",
} as const;

export const FINANCE_PERMISSION_MODEL = {
  viewDoesNotImplyStructureManage: true,
  viewDoesNotImplyPersonnelCompensation: true,
  viewDoesNotImplyApprove: true,
  structureManageKey: PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_STRUCTURE_MANAGE,
} as const;

/** Capability-driven navigation — no hardcoded sport/country nav tree (ADR-028). */
export const FINANCE_CAPABILITY_KEYS = [
  "OVERVIEW",
  "MANAGEMENT_INCOME_STATEMENT",
  "BUDGETING",
  "ACTUALS",
  "FORECASTING",
  "COST_CENTERS",
  "PROJECTS",
  "FUNDS",
  "RECEIVABLES",
  "PAYABLES",
  "COMMITMENTS",
  "APPROVALS",
  "PERSONNEL_FINANCE",
  "EVENT_FINANCE",
  "GRANTS",
  "LIQUIDITY",
  "ACCOUNTING_INTEGRATION",
  "UNIT_ECONOMICS",
  "REPORTING",
] as const;

export type FinanceCapabilityKey = (typeof FINANCE_CAPABILITY_KEYS)[number];

export const FINANCE_UX_MODEL = {
  capabilityDrivenFinanceUx: true,
  progressiveFinanceComplexity: true,
  financeNavigationCapabilityDriven: true,
  financeNavigationPermissionAware: true,
  financeNavigationSportAgnostic: true,
  hardcodedFinanceNavigation: false,
} as const;

export const FINANCE_NAVIGATION_ENTRIES = [
  {
    key: "overview",
    requiredCapabilities: ["OVERVIEW"] as const,
    permissionKeys: [PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW],
    labelKey: "finance.nav.overview",
  },
  {
    key: "income_statement",
    requiredCapabilities: ["MANAGEMENT_INCOME_STATEMENT"] as const,
    permissionKeys: [PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW],
    labelKey: "finance.nav.income_statement",
  },
  {
    key: "budget",
    requiredCapabilities: ["BUDGETING"] as const,
    permissionKeys: [
      PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW,
      PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_BUDGET_VIEW,
    ],
    labelKey: "finance.nav.budget",
  },
  {
    key: "actuals",
    requiredCapabilities: ["ACTUALS"] as const,
    permissionKeys: [
      PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW,
      PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_ACTUAL_VIEW,
    ],
    labelKey: "finance.nav.actuals",
  },
  {
    key: "forecast",
    requiredCapabilities: ["FORECASTING"] as const,
    permissionKeys: [PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_FORECAST_MANAGE],
    labelKey: "finance.nav.forecast",
  },
  {
    key: "cost_centers",
    requiredCapabilities: ["COST_CENTERS"] as const,
    permissionKeys: [PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW],
    labelKey: "finance.nav.cost_centers",
  },
  {
    key: "projects",
    requiredCapabilities: ["PROJECTS"] as const,
    permissionKeys: [PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW],
    labelKey: "finance.nav.projects",
  },
  {
    key: "funds",
    requiredCapabilities: ["FUNDS"] as const,
    permissionKeys: [PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW],
    labelKey: "finance.nav.funds",
  },
  {
    key: "structure",
    requiredCapabilities: [] as const,
    permissionKeys: [PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_STRUCTURE_MANAGE],
    labelKey: "finance.nav.structure",
  },
  {
    key: "reports",
    requiredCapabilities: ["REPORTING"] as const,
    permissionKeys: [PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW],
    labelKey: "finance.nav.reports",
  },
] as const;

/** Contextual analysis surfaces (team/org/event/personnel) — not global mandatory nav sections. */
export const FINANCE_CONTEXTUAL_ANALYSIS_SURFACES = [
  "UNIT_ECONOMICS",
  "EVENT_FINANCE",
  "PERSONNEL_FINANCE",
  "ORG_UNIT_ROLLUP",
] as const;

export const FINANCE_WORKSPACE_ROUTE_V1 = "/dashboard/finance" as const;

/** FIN-01B UX recommendation — architecture only (ADR-028). */
export const FINANCE_STRUCTURE_BUILDER_UX_RECOMMENDATION = {
  primaryPattern: "tree_table_hybrid",
  rationale:
    "Financial hierarchies are deep and wide; pure canvas org-builder UX does not scale to hundreds of accounts/cost centers.",
  interactions: [
    "expand_collapse_tree",
    "inline_rename",
    "drag_drop_reparent_with_drop_zones",
    "sibling_reorder",
    "inspector_panel_for_semantics_and_links",
    "command_palette_create_search",
    "archive_reactivate_actions",
    "dependency_blocked_delete_with_explanation",
  ],
  accessibility: ["keyboard_nudge_reorder", "focus_visible", "aria_treegrid_roles"],
  responsive: "collapse_inspector_to_sheet_on_narrow_viewports",
  scaleTargets: { minItems: 5, maxItems: 500 },
} as const;

export const FINANCE_STRUCTURE_HISTORY_MODEL = {
  undoableActions: [
    "rename",
    "move",
    "reparent",
    "reorder",
    "create",
    "archive",
    "reactivate",
  ],
  deleteRequiresExplicitConfirmation: true,
  historicalFinancialIntegrityOverridesUndo: true,
  implementationPhase: "FIN-01B+",
} as const;

export const FINANCE_STRUCTURE_DELETE_UNDO_STRATEGY = {
  hardDelete: "not_undoable; blocked when dependents exist",
  archive: "undoable within session when no new postings reference archived node",
  restoreFromArchive: "undo stack entry or explicit reactivate",
} as const;

export const FINANCE_DESIGN_SYSTEM = {
  compliance: "PASS",
  consumesSceDesignSystemV1: true,
  localFinanceDesignSystem: false,
  binaryControlCompliance: "PASS",
  newBinaryCheckboxes: 0,
  canonicalTogglesUsed: true,
  multiSelectionPattern: "CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION",
} as const;

export const FINANCE_DATA_BOUNDARY = {
  schemaMigrationFin01a: false,
  seedChangeFin01a: false,
  productionFinanceUiFin01a: false,
  tenantIsolation: "All finance rows carry tenantId; dimension FKs must match tenant",
  passwordMutation: false,
} as const;

export const FINANCE_MONEY_MODEL = {
  ...FINANCE_AMOUNT_STORAGE,
  hardcodedCurrency: false,
  tenantBaseCurrencyConfigurable: true,
  floatingPointMoney: false,
  multiCurrencyFutureCompatible: true,
} as const;

export const COUNTRY_LOCALIZATION_MODEL = {
  countryLocalizationLayerAllowed: true,
  countryLocalizationContaminatesCoreModel: false,
  examples: [
    "language",
    "financial_terminology",
    "currency_defaults",
    "number_formats",
    "country_templates",
    "tax_mappings",
    "accounting_mappings",
  ],
} as const;

export const TAX_LOCALIZATION_MODEL = {
  taxRulesHardcodedInCore: false,
  countryAccountingRulesHardcodedInCore: false,
} as const;

export const OPTIONAL_TEMPLATE_MODEL = {
  optionalTemplatesAllowed: true,
  templateBecomesCoreAssumption: false,
  templateApplicationBecomesTenantConfiguration: true,
  exampleTemplateIds: [
    "small_sports_organisation",
    "team_sports_organisation",
    "individual_sports_organisation",
    "multi_sport_organisation",
    "federation_association",
    "advanced_financial_management",
    "start_from_scratch",
  ],
} as const;

/** Liquidity / cash timing — future layer (ADR-016, ADR-021). */
export const LIQUIDITY_LAYER_FUTURE = {
  distinguishesResultFromCash: true,
  fin01Implementation: false,
  revenueNotEqualCashReceived: true,
  expenseNotEqualCashPaid: true,
} as const;

export const RECEIVABLE_PAYABLE_ARCHITECTURE = {
  receivableArchitecture: "FinanceReceivable linked to posting/invoice reference — FIN-06+",
  payableArchitecture: "FinancePayable linked to posting/invoice reference — FIN-06+",
  invoiceAmountEqualsRevenueEqualsCash: false,
} as const;

export const PAYMENT_ADJUSTMENT_ARCHITECTURE = {
  refund: "future adjustment posting / linked credit",
  credit: "future linked credit memo semantics",
  waiver: "future non-cash reduction with audit",
  writeOff: "future bad debt semantics",
  instalment: "future payment plan schedule",
  partialPayment: "supported via receivable balance — future",
} as const;

export const GROSS_FEE_NET_ARCHITECTURE = {
  grossFeeNetSupportedByTargetArchitecture: true,
  paymentProviderAgnostic: true,
  hardcodedStripeSemantics: false,
} as const;

export const MULTIPLE_BANK_ACCOUNT_ARCHITECTURE = {
  oneOrganisationOneBankAccount: false,
  multipleBankAccountsSupportedFuture: true,
  multiplePayoutAccountsSupportedFuture: true,
} as const;

export const ACCOUNTING_INTEGRATION_ARCHITECTURE = {
  accountMappingFuture: true,
  journalExportFuture: true,
  apiIntegrationFuture: true,
  reconciliationReferencesFuture: true,
  providerHardcoded: false,
} as const;

export const FCA_REFERENCE_ROLE = {
  role: "REFERENCE_IMPLEMENTATION_AND_IMPORT_CASE",
  fcaReferenceIsProductSchema: false,
  fcaWorkbookProgrammaticAnalysis: "PENDING" as const,
  fcaImportModelPreserved: true,
  fcaSpecificAssumptionsRemovedFromCore: true,
} as const;

/** Available = Budget - Actual - open Commitments (FIN-05 package in revised roadmap). */
export const COMMITMENT_AVAILABLE_FORMULA =
  "AVAILABLE = BUDGET - ACTUAL - OUTSTANDING_COMMITMENTS" as const;

export interface FinanceDimensionAssignmentContract {
  kind: FinanceDimensionKind | "CUSTOM";
  customDimensionDefinitionId?: string;
  /** Exactly one canonical entity id for typed kinds — enforced in service layer. */
  entityId: string;
}

export interface FinancialPostingContract {
  tenantId: string;
  financeYearId: string;
  accountId: string;
  measure: FinancialMeasureKind;
  amountMinor: number;
  currency: string;
  budgetVersionId?: string;
  scenarioId?: string;
  dimensions: FinanceDimensionAssignmentContract[];
}

export function isBudgetVersionImmutable(status: BudgetVersionStatus): boolean {
  return status === "APPROVED" || status === "LOCKED";
}

/** FIN-01A-R1 implementation readiness gates (see SCE-FINANCE-01A.md). */
export const FINANCE_IMPLEMENTATION_READINESS = {
  architectureContradictionsRemaining: false,
  fcaReferenceAnalysisBlockerForGenericArchitecture: false,
  fcaImportValidationBlockedUntilWorkbookAnalysis: true,
  sceFinance01aR1ReadyForPoReview: true,
  sceFinance01ArchitectureReadyForImplementation: true,
} as const;
