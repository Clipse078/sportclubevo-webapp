/**
 * SCE Finance FIN-04C — Rolling forecast & reforecasting architecture contract.
 *
 * Pure types/constants — no Prisma, persistence, or UI in FIN-04C-01.
 *
 * Principles (FIN-04B + FIN-04C):
 * - SCE generates the projection. The organisation owns the forecast.
 * - The current forecast is a living management view; formal reforecasts create governance history.
 */

import { FINANCIAL_YEAR_CONFIGURABLE } from "@/lib/finance/finance-architecture";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";
import {
  PROJECTION_GERMAN_PRODUCT_TERMS,
  SCE_MEASURE_ACTUAL,
  SCE_MEASURE_APPROVED_BUDGET,
  SCE_MEASURE_CURRENT_FORECAST,
  SCE_MEASURE_SCENARIO,
  SCE_MEASURE_SCE_PROJECTION,
} from "@/lib/finance/projection/projection-architecture-contract";

/** FIN-04C product principle (locked in architecture). */
export const ROLLING_FORECAST_PRODUCT_PRINCIPLE =
  "THE CURRENT FORECAST IS A LIVING MANAGEMENT VIEW. FORMAL REFORECASTS CREATE GOVERNANCE HISTORY." as const;

/** Organisation-owned management expectation (editable working surface when CURRENT). */
export const FORECAST_LIFECYCLE_WORKING_CURRENT = "WORKING_CURRENT_FORECAST" as const;
/** Explicit management checkpoint preserved as immutable history. */
export const FORECAST_LIFECYCLE_FORMAL_REVISION = "FORMAL_FORECAST_REVISION" as const;
/** Prior formal revision retained for comparison/audit (SUPERSEDED). */
export const FORECAST_LIFECYCLE_HISTORICAL_VERSION = "HISTORICAL_FORECAST_VERSION" as const;

export type ForecastLifecycleConcept =
  | typeof FORECAST_LIFECYCLE_WORKING_CURRENT
  | typeof FORECAST_LIFECYCLE_FORMAL_REVISION
  | typeof FORECAST_LIFECYCLE_HISTORICAL_VERSION;

/**
 * Canonical FIN-04C approach (evolved Option A — rejected Option B DRAFT and Option C split lines):
 *
 * - `FinanceForecastVersion` with status CURRENT is the living Aktuelle Prognose; line edits apply in-place.
 * - A formal reforecast supersedes the prior CURRENT (immutable history) and promotes a new CURRENT seeded from it.
 * - Manual field edits do not create a new version; only explicit formal revision (or FIN-04B adoption) does.
 */
export const ROLLING_FORECAST_WORKING_VS_FORMAL_DECISION = {
  chosenApproach: "MUTABLE_CURRENT_WITH_IMMUTABLE_SUPERSEDED_CHECKPOINTS" as const,
  rejectedDraftState: true,
  rejectedSeparateWorkingLineTable: true,
  manualLineEditCreatesFormalVersion: false,
  explicitFormalReforecastCreatesFormalVersion: true,
  fin04bAdoptionCreatesFormalVersion: true,
} as const;

/** Extensible revision sources — FIN-04C-02 may persist as enum/string. */
export const FORECAST_REVISION_SOURCES = [
  "INITIAL_FORECAST",
  "MANUAL_REFORECAST",
  "AUTOMATIC_FORECAST_ADOPTION",
] as const;

export type ForecastRevisionSource = (typeof FORECAST_REVISION_SOURCES)[number];

/** FIN-04B adoption remains a meaningful formal revision source (PO UAT). */
export const FIN_04B_ADOPTION_REVISION_SOURCE: ForecastRevisionSource =
  "AUTOMATIC_FORECAST_ADOPTION";

/** `FinanceForecastVersionStatus` lifecycle — no DRAFT in FIN-04C. */
export const FORECAST_VERSION_STATUSES = ["CURRENT", "SUPERSEDED"] as const;

export type ForecastVersionStatus = (typeof FORECAST_VERSION_STATUSES)[number];

/** Legal status transitions for formal forecast versions. */
export const FORECAST_VERSION_STATE_MACHINE = {
  initialCreation: { from: null, to: "CURRENT" as ForecastVersionStatus },
  formalRevision: {
    from: "CURRENT" as ForecastVersionStatus,
    to: "SUPERSEDED" as ForecastVersionStatus,
    pairedWith: "NEW_CURRENT_FROM_PRIOR_LINES" as const,
  },
  supersededMutationForbidden: true,
  inferCurrentByMaxVersionNumberForbidden: true,
  currentFromFinanceForecastPointer: true,
} as const;

/** Forecast revision temporal semantics — distinct from row `createdAt`. */
export type ForecastRevisionAsOfMetadata = {
  /** Datenstand / information cutoff (inclusive calendar date, tenant finance-year scoped). */
  asOfDate: string;
  /** Latest actual evidence included when the revision was established (inclusive date). */
  actualsThroughDate: string;
  financeYearId: string;
};

export const FORECAST_AS_OF_DATE_SEMANTICS = {
  asOfDateDistinctFromCreatedAt: true,
  asOfDateDistinctFromUpdatedAt: true,
  monthEndNotRequired: true,
  mustRespectTenantFinanceYearBoundaries: true,
  /** Stored on formalized (superseded) revision snapshots in FIN-04C-02+. */
  persistedOnFormalRevision: true,
} as const;

/** Full-year forecast composition at a cutoff (conceptual — lines stay annual). */
export const FORECAST_REFORECAST_COMPOSITION = {
  fullYearExpectationAtCutoff:
    "KNOWN_ACTUAL_THROUGH_CUTOFF_PLUS_EXPECTED_REMAINDER" as const,
  forecastLineRemainsAnnualAmountMinor: true,
  splitActualRemainderColumnsOnForecastLine: false,
  reconstructFromCutoffMetadataPlusActualHistory: true,
  doNotFabricateHistoricalKnownActualFromToday: true,
} as const;

/** Durable architecture locks reviewed in FIN-04C-01. */
export const SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS = {
  approvedBudgetImmutableDuringReforecasting: true,
  currentForecastOrganisationOwned: true,
  automaticForecastIndependentFromCurrentForecast: true,
  reforecastDistinctFromScenario: true,
  scenarioKeyNotForOrdinaryRevisions: true,
  formalReforecastCreatesMeaningfulImmutableHistory: true,
  manualLineEditDoesNotCreateFormalVersion:
    ROLLING_FORECAST_WORKING_VS_FORMAL_DECISION.manualLineEditCreatesFormalVersion ===
    false,
  fin04bAdoptionRemainsMeaningfulFormalRevision: true,
  forecastHistoryUsesStableVersionIds: true,
  currentForecastVersionFromContainerPointer: true,
  inferCurrentVersionByMaxVersionNumberForbidden: true,
  financeYearTenantDefined: FINANCIAL_YEAR_CONFIGURABLE,
  noFixedReforecastCadence: true,
  noFakeForecastPhasing: FORECAST_PHASING_SUPPORTED === false,
  numericalForecastNotLlm: true,
  automaticForecastRefreshNeverCreatesCurrentForecastRevision: true,
  currentForecastChangeNeverMarksAutomaticForecastStale: true,
  automaticForecastNeverSilentlyOverwritesCurrentForecast: true,
  historicalFormalRevisionsOrdinarilyUndeletable: true,
  fin05Fin06StableSnapshotReferencesRequired: true,
  fin04aFin04bModelsRemainValid: true,
} as const;

/** FIN-04D boundary — scenarios are what-if, not rolling forecast history. */
export const ROLLING_FORECAST_SCENARIO_BOUNDARY = {
  reforecastIsCanonicalExpectation: true,
  scenarioIsHypotheticalAlternative: true,
  scenarioUsesScenarioKeyOnForecastVersion: true,
  ordinaryRevisionMustNotUseScenarioKey: true,
  scenarioDoesNotPolluteFormalHistoryUntilExplicitPromotion: true,
} as const;

/** Permissions — reuse FIN-04A/04B keys (no proliferation). */
export const ROLLING_FORECAST_PERMISSION_CONTRACT = {
  viewCurrentHistoryAndComparisons: "finance.forecast.view",
  editCurrentAndCreateFormalReforecast: "finance.forecast.manage",
  adminImplied: "finance.admin",
} as const;

/**
 * German product terminology (tenant-facing — distinct from Automatische Prognose refresh).
 * @see PROJECTION_GERMAN_PRODUCT_TERMS for automatic forecast labels.
 */
export const ROLLING_FORECAST_GERMAN_PRODUCT_TERMS = {
  ...PROJECTION_GERMAN_PRODUCT_TERMS,
  /** Explicit formal checkpoint of the organisation-owned expectation (FIN-04C action). */
  formalReforecastAction: "Neue Prognose festhalten",
  /** History list inside Prognose workspace. */
  forecastHistorySection: "Prognoseverlauf",
  /** Secondary metadata — not primary mental model. */
  versionNumberLabel: "Version",
} as const;

/** UX contract — primary labels emphasize when/why, not version IDs alone. */
export const ROLLING_FORECAST_UX_CONTRACT = {
  historyLivesInsidePrognoseWorkspace: true,
  noSeparateTopLevelFinanceHistoryTab: true,
  primaryHistoryLabels: ["date", "optionalLabel", "optionalNote"] as const,
  versionNumberSecondaryMetadata: true,
  comparisonPairsSupported: [
    "CURRENT_VS_APPROVED_BUDGET",
    "CURRENT_VS_PREVIOUS_FORMAL_REVISION",
    "CURRENT_VS_AUTOMATIC_FORECAST",
    "PREVIOUS_REVISION_VS_BUDGET",
    "ACTUAL_VS_HISTORICAL_FORECAST",
  ] as const,
} as const;

/** Optimistic concurrency — reuse version identity expectations from FIN-04B adoption. */
export const ROLLING_FORECAST_CONCURRENCY_CONTRACT = {
  formalReforecastRequiresExpectedCurrentVersionId: true,
  staleEditorMustRefreshNotSilentlyOverwrite: true,
  adoptionAndReforecastMayRace: true,
  resolveViaFinanceForecastCurrentVersionIdPointer: true,
} as const;

/** Governance — corrections via new revision, not destructive history edits. */
export const ROLLING_FORECAST_DELETION_POLICY = {
  formalHistoricalVersionsOrdinarilyUndeletable: true,
  correctionsViaNewFormalRevision: true,
  noOrdinaryManagementDeleteUiInFin04c: true,
} as const;

/** Legacy FIN-04A/04B versions without FIN-04C metadata remain valid. */
export const ROLLING_FORECAST_LEGACY_COMPATIBILITY = {
  existingForecastVersionsRemainReadable: true,
  missingAsOfDateFallbackDisplayUsesCreatedAtDateOnly: true,
  doNotInventFalseHistoricalCutoffOrLabels: true,
  missingRevisionSourceTreatAsLegacyUnknown: true,
  fin04bAdoptionProvenanceViaFinanceProjectionAdoption: true,
} as const;

/**
 * FIN-04C-02 implemented persistence facts (migration `20261024120000_sce_finance_04c_02_forecast_revision_lifecycle`).
 */
/**
 * FIN-04C-03 implemented formal reforecast service facts.
 */
export const ROLLING_FORECAST_FIN_04C_03_FORMAL_REFORECAST = {
  tenantFacingAction: "Neue Prognose festhalten",
  previewService: "previewFormalCurrentForecast",
  formalizationService: "formalizeCurrentForecast",
  manualRevisionSourceSystemOwned: "MANUAL_REFORECAST",
  manualEditDistinctFromFormalRevision: true,
  promotedCurrentCarriesRevisionMetadata: true,
  supersededPriorBecomesImmutableHistory: true,
  formalizationPreservesFinancialAmounts: true,
  noAutomaticForecastSideEffects: true,
  expectedCurrentForecastVersionIdRequired: true,
  financeYearCutoffValidationRequired: true,
  actualsThroughDefaultsToAsOfDateWhenOmitted: true,
  revisionLabelOptional: true,
  mutableCurrentUntilNextFormalRevision: true,
} as const;

/** FIN-04C-06 clarity & reforecast context principles (locked). */
export const ROLLING_FORECAST_FIN_04C_06_CLARITY_PRINCIPLES = {
  progressiveDisclosure:
    "SCE Finance uses progressive disclosure. Financial workspaces lead with management meaning, changes and exceptions; detailed values, history and calculation evidence remain available on demand.",
  comparisonFirst:
    "A user should not need to mentally compare multiple financial versions to understand the current situation. SCE performs the comparison and communicates the result first.",
  conclusionsFirst: "Show conclusions first. Numbers explain the conclusion.",
  valueComparedDifferenceDriver:
    "VALUE → COMPARED WITH → DIFFERENCE → DRIVER (render only what helps)",
  numbersWithPurpose:
    "A number is prominent only when it answers heading, change, budget fit, or review need.",
  currentForecastDominance:
    "Current Forecast is the organisation-owned management view; Automatic Forecast is supporting intelligence.",
  fin04dBoundary: "Scenario UX and FIN-04D remain out of scope for FIN-04C-06.",
} as const;

/** FIN-04C-06 implemented forecast clarity & optional reforecast reason persistence. */
export const ROLLING_FORECAST_FIN_04C_06_REFORECAST_CONTEXT = {
  revisionReasonEnum: "FinanceForecastRevisionReason",
  revisionReasonOptional: true,
  revisionContextOptionalForOther: true,
  revisionLabelIndependentFromReason: true,
  actualsThroughHiddenByDefault: true,
  actualsThroughDefaultsToAsOfDate: true,
  legacyRevisionsNullReason: true,
} as const;

/** FIN-04C-05 implemented Prognose workspace UX integration. */
export const ROLLING_FORECAST_FIN_04C_05_WORKSPACE_UX = {
  workspaceRoute: "/dashboard/finance/forecast",
  primarySection: "Aktuelle Prognose",
  formalReforecastDialog: "Neue Prognose festhalten",
  prognoseverlaufSection: "Prognoseverlauf",
  actualsThroughHiddenDefaultsToAsOfDate: true,
  automaticForecastSectionAfterCurrentForecast: true,
  noBinaryCheckboxConfirmation: true,
} as const;

/** FIN-04C-04 implemented Prognoseverlauf read & comparison query layer. */
export const ROLLING_FORECAST_FIN_04C_04_HISTORY_COMPARISON = {
  historyQueryService: "loadFinanceForecastHistory",
  versionComparisonService: "compareFinanceForecastVersions",
  currentVsPreviousService: "getCurrentForecastVsPrevious",
  currentVsApprovedBudgetService: "getCurrentForecastVsApprovedBudget",
  prognoseverlaufCanonicalManagementRevisionsOnly: true,
  automaticForecastExcludedFromHistory: true,
  financeProjectionVersionExcludedFromHistory: true,
  scenarioKeyExcludedFromHistory: true,
  currentIdentifiedOnlyByCurrentVersionId: true,
  historicalTotalsFromStoredVersionLines: true,
  accountIdentityFinancialAccountId: true,
  comparisonDeltaComparisonMinusBase: true,
  absenceDistinctFromExplicitZero: true,
  noFavorabilityInQueryLayer: true,
  noMisleadingFullYearForecastMinusYtdActual: true,
  approvedBudgetComparisonUsesGovernanceBaseline: true,
  viewPermissionOnly: "finance.forecast.view",
} as const;

export const ROLLING_FORECAST_FIN_04C_02_PERSISTENCE = {
  financeForecastVersionRevisionMetadataPersisted: true,
  legacyRevisionMetadataNullable: true,
  formalRevisionPrimitive: "persistFormalForecastRevision",
  sharedVersionTransitionPrimitive: "executeForecastVersionSnapshotTransition",
  revisionMetadataOnPromotedCurrentVersion: true,
  financeProjectionAdoptionRemainsAdoptionAudit: true,
  sourceProjectionVersionIdDistinctFromAdoption: true,
  manualLineEditUsesUpsertForecastLineInPlace: true,
  supersededLineMutationRejected: true,
  expectedCurrentVersionIdConcurrencyGuard: true,
} as const;

/**
 * Data-model evolution (FIN-04C-01 recommendation; FIN-04C-02 implements FinanceForecastVersion extension).
 */
export const ROLLING_FORECAST_DATA_MODEL_EVOLUTION = {
  FinanceForecast: { action: "KEEP" as const, notes: "Container + currentVersionId pointer unchanged." },
  FinanceForecastLine: { action: "KEEP" as const, notes: "Annual amountMinor grain unchanged." },
  FinanceForecastVersion: {
    action: "EXTEND" as const,
    recommendedFields: [
      "asOfDate",
      "actualsThroughDate",
      "revisionSource",
      "revisionLabel",
      "revisionReason",
      "revisionContext",
      "previousVersionId",
      "sourceProjectionVersionId",
    ] as const,
    keepFields: ["id", "forecastId", "status", "versionNumber", "scenarioKey", "note", "createdByUserId", "createdAt", "updatedAt"],
    scenarioKey: "KEEP_FOR_FIN_04D_ONLY",
  },
  FinanceProjectionAdoption: { action: "KEEP" as const, notes: "Provenance for adoption revisions." },
} as const;

/** Measure separation guards (reforecast architecture). */
export const ROLLING_FORECAST_MEASURE_GUARDS = {
  measures: [
    SCE_MEASURE_APPROVED_BUDGET,
    SCE_MEASURE_ACTUAL,
    SCE_MEASURE_SCE_PROJECTION,
    SCE_MEASURE_CURRENT_FORECAST,
    SCE_MEASURE_SCENARIO,
  ] as const,
  reforecastMapsTo: SCE_MEASURE_CURRENT_FORECAST,
  scenarioMapsTo: SCE_MEASURE_SCENARIO,
} as const;
