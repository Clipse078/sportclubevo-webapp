/**
 * SCE Finance FIN-04D — Scenario & what-if architecture contract.
 *
 * Pure types/constants — no Prisma, persistence, calculation services, or UI in FIN-04D-01.
 *
 * Principle: A scenario is a hypothetical management model. It is not the current forecast,
 * approved budget, automatic forecast, or actual — and does not become reality by being created.
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

/** FIN-04D product principle (locked in architecture). */
export const SCENARIO_PRODUCT_PRINCIPLE =
  "A SCENARIO IS A HYPOTHETICAL MANAGEMENT MODEL USED TO ANSWER WHAT IF — NOT THE CURRENT FORECAST, NOT GOVERNANCE BASELINE, NOT AUTOMATIC FORECAST, NOT ACTUAL." as const;

/** SCE UX principle applied to scenarios (programme-wide). */
export const SCENARIO_SCE_UX_PRINCIPLE =
  "SIMPLE UNDERSTANDING. SHALLOW NAVIGATION. DEEP CAPABILITY." as const;

/** Information compression default: conclusion → why → detail → evidence. */
export const SCENARIO_INFORMATION_ARCHITECTURE = [
  "INTERPRETATION",
  "EXCEPTION",
  "EXPLANATION",
  "EVIDENCE",
] as const;

/** Durable architecture locks reviewed in FIN-04D-01. */
export const SCE_SCENARIO_ARCHITECTURE_LOCKS = {
  scenarioDistinctFromCurrentForecast: true,
  scenarioDistinctFromApprovedBudget: true,
  scenarioDistinctFromAutomaticForecast: true,
  scenarioDistinctFromActual: true,
  scenarioDistinctFromFormalReforecast: true,
  scenarioNeverSilentlyBecomesCurrentForecast: true,
  scenarioNeverMutatesApprovedBudget: true,
  scenarioNeverMutatesActuals: true,
  automaticForecastNeverMutatesScenarioAssumptions: true,
  currentForecastChangeNeverSilentlyRebasesScenario: true,
  numericalScenarioNotLlm: true,
  llmMayAssistExplanationOnly: true,
  tenantIsolated: true,
  financeYearScoped: true,
  financeYearTenantDefined: FINANCIAL_YEAR_CONFIGURABLE,
  noHardcodedCurrency: true,
  noFakeMonthlyPhasing: FORECAST_PHASING_SUPPORTED === false,
  noTimedCashInV1: true,
  sportAgnostic: true,
  countryAgnostic: true,
  organisationAgnostic: true,
  inferCurrentForecastByMaxVersionNumberForbidden: true,
  currentForecastBaselineFromFinanceForecastPointer: true,
  /** FIN-04A `scenarioKey` on forecast versions is not the canonical scenario persistence model. */
  financeForecastVersionScenarioKeyNotCanonicalScenarioStore: true,
  ordinaryReforecastMustNotUseScenarioKey: true,
  scenarioExcludedFromPrognoseverlauf: true,
} as const;

/** Canonical measure mapping (aligns with FIN-04B projection contract). */
export const SCENARIO_MEASURE_GUARDS = {
  measures: [
    SCE_MEASURE_APPROVED_BUDGET,
    SCE_MEASURE_ACTUAL,
    SCE_MEASURE_SCE_PROJECTION,
    SCE_MEASURE_CURRENT_FORECAST,
    SCE_MEASURE_SCENARIO,
  ] as const,
  scenarioMapsTo: SCE_MEASURE_SCENARIO,
  currentForecastMapsTo: SCE_MEASURE_CURRENT_FORECAST,
} as const;

/**
 * What a Finance Scenario is (domain):
 * - Tenant-owned, FinanceYear-scoped analytical container answering one management question.
 * - Contains explicit assumptions (intent) applied to a frozen baseline snapshot.
 * - Produces deterministic derived account amounts and income/expense/result totals.
 * - Does not participate in formal forecast governance until explicit adoption (future package).
 */
export const SCENARIO_DOMAIN_DEFINITION = {
  identity: "FinanceScenario.id (stable UUID — proposed FIN-04D-02)",
  tenantOwnership: "tenantId",
  financeYearOwnership: "financeYearId",
  humanIdentity: "name (unique per tenant+financeYear among active scenarios)",
  optionalDescription: true,
  noScenarioIsCurrentConcept: true,
  notApprovedBudget: true,
  notAutomaticForecast: true,
} as const;

/** Baseline reference kinds a scenario may start from. */
export const SCENARIO_BASELINE_REFERENCE_KINDS = [
  "CURRENT_FORECAST",
  "APPROVED_BUDGET",
  "AUTOMATIC_FORECAST",
  "OTHER_SCENARIO",
] as const;

export type ScenarioBaselineReferenceKind =
  (typeof SCENARIO_BASELINE_REFERENCE_KINDS)[number];

/**
 * Baseline policy (FIN-04D-01 decision):
 *
 * Hybrid REFERENCE + SNAPSHOT:
 * - Store which measure/version was the starting reference (provenance).
 * - Freeze baseline account amounts at scenario creation for truthful later comparison.
 * - Primary UX comparison: scenario result vs frozen baseline (labelled with source version / Datenstand).
 * - Live current forecast may be shown as secondary context only (FIN-04D-04), never silently replacing baseline.
 */
export const SCENARIO_BASELINE_POLICY = {
  primaryBaselineMeasure: SCE_MEASURE_CURRENT_FORECAST,
  v1AllowedStartReferences: ["CURRENT_FORECAST"] as const satisfies readonly ScenarioBaselineReferenceKind[],
  v1ExcludedStartReferences: ["AUTOMATIC_FORECAST"] as const satisfies readonly ScenarioBaselineReferenceKind[],
  approvedBudgetStartDeferred: true,
  otherScenarioStartDeferred: true,
  snapshotStrategy: "REFERENCE_PLUS_FROZEN_BASELINE_LINES" as const,
  dynamicFollowLiveCurrentForecastForbidden: true,
  baselineMetadataRequired: ["baselineReferenceKind", "baselineForecastVersionId", "asOfDate"] as const,
  optionalBaselineMetadata: ["actualsThroughDate", "baselineProjectionVersionId"] as const,
  currencyFromFinanceContext: true,
} as const;

/**
 * Stability when Current Forecast formalizes a new version (FIN-04D-01 decision):
 *
 * Policy C — remain on creation baseline; optional explicit rebase in FIN-04D-06 only.
 */
export const SCENARIO_STABILITY_POLICY = {
  onCurrentForecastFormalRevision: "REMAIN_ON_CREATION_BASELINE" as const,
  silentRebaseForbidden: true,
  baselineOutdatedIndicatorWhenLiveCurrentDiffers: true,
  explicitRebaseFutureActionGerman: "Auf aktuelle Prognose aktualisieren",
  explicitRebasePackage: "FIN-04D-06",
  rebaseCarriesAssumptionsForward: true,
  rebaseConflictResolutionExplicit: true,
} as const;

/** v1 assumption kinds — intent stored separately from calculated results. */
export const SCENARIO_ASSUMPTION_KINDS_V1 = [
  "PERCENT_CHANGE",
  "DELTA_AMOUNT",
  "ABSOLUTE_AMOUNT",
  "EXCLUDE_ACCOUNT",
] as const;

export type ScenarioAssumptionKindV1 = (typeof SCENARIO_ASSUMPTION_KINDS_V1)[number];

/** Future extensibility — not implemented in FIN-04D v1. */
export const SCENARIO_ASSUMPTION_EXTENSION_BOUNDARY = {
  v1Target: "FinancialAccount.id + annual amountMinor grain",
  futureDriverAssumptionKinds: ["DRIVER_INPUT", "TIMING_SHIFT"] as const,
  futureDriverRefFieldReserved: "driverRefJson nullable in FIN-04D-02+",
  noGenericRulesEngineInV1: true,
  assumptionsNotFullForecastCopy: true,
} as const;

export const SCENARIO_ASSUMPTION_RULES_V1 = {
  oneAssumptionPerAccount: true,
  assumptionOrderDeterministic: "financialAccountId ascending, then assumption id",
  conflictingAssumptionsRejected: true,
  intentStoredSeparatelyFromCalculatedResult: true,
  percentStoredAsBasisPoints: true,
  percentBasisPointsScale: 10000,
  deltaAndAbsoluteStoredAsAmountMinor: true,
  archivedAccountPolicy: "reject new assumptions; existing assumptions remain until edited",
  accountAddedAfterScenarioCreation: "no baseline line until explicit assumption or rebase",
  accountDeactivatedAfterScenarioCreation: "baseline frozen; assumptions on archived accounts rejected on edit",
} as const;

/** Deterministic calculation semantics (engine in FIN-04D-03). */
export const SCENARIO_CALCULATION_SEMANTICS = {
  formulaConcept: "baselineAccountAmount + assumptionTransform = scenarioAccountAmount",
  integerMinorUnitsOnly: true,
  floatingPointCurrencyForbidden: true,
  percentRounding: "roundRationalToMinor (half away from zero at minor boundary)",
  zeroExplicit: true,
  nullBaselineDistinctFromZero: true,
  nullBaselineWithPercentOrDeltaRejected: true,
  absoluteAmountMayCreateLineWithoutBaseline: true,
  excludeAccountSetsZero: true,
  negativeAmountsAllowedWhenFinanceSemanticsAllow: true,
  noFxConversion: true,
  currencyMustMatchFinanceYearContext: true,
  deterministicGivenSameInputs: true,
  calculatedResultsMayBePersistedAsCache: true,
  authoritativeSourceOfTruth: "assumptions + frozen baseline",
} as const;

/** Scenario lifecycle — analytical tool, not governance baseline. */
export const SCENARIO_LIFECYCLE_STATES = {
  active: "archivedAt is null",
  archived: "archivedAt is set",
  noDraftPublishedApproved: true,
} as const;

export const SCENARIO_LIFECYCLE_ACTIONS = {
  create: "finance.forecast.manage",
  editAssumptions: "finance.forecast.manage",
  rename: "finance.forecast.manage",
  duplicate: "finance.forecast.manage",
  archive: "finance.forecast.manage",
  restore: "finance.forecast.manage",
  delete: "finance.forecast.manage — hard delete when no adoption provenance",
  compare: "finance.forecast.view",
  adoptToCurrentForecast: "finance.forecast.manage — explicit future FIN-04D-06",
} as const;

/**
 * Versioning decision: LIGHTWEIGHT
 * - `updatedAt` / `updatedByUserId` on scenario + assumptions.
 * - No immutable scenario version history in v1; duplicate scenario for intentional alternatives.
 * - Formal audit for adoption uses forecast revision + FinanceScenarioAdoption provenance (future).
 */
export const SCENARIO_VERSIONING_DECISION = "LIGHTWEIGHT" as const;

export const SCENARIO_VERSIONING_RATIONALE =
  "Scenarios are exploratory analytics, not governance checkpoints. Duplication covers intentional forks; forecast formal history remains on FinanceForecastVersion." as const;

/** Comparison hierarchy (presentation — query layer FIN-04D-04). */
export const SCENARIO_COMPARISON_HIERARCHY = {
  primary: "SCENARIO_RESULT vs FROZEN_BASELINE (creation reference)",
  primaryLabelPattern: "vs Ausgangspunkt (Aktuelle Prognose · Version n · Datenstand)",
  secondary: "SCENARIO_RESULT vs APPROVED_BUDGET",
  tertiaryDeferred: "SCENARIO vs SCENARIO",
  liveCurrentForecastContextSecondaryOnly: true,
  defaultSingleHeadlineDelta: "resultDeltaMinor",
  deltaFormula: "comparison − base",
  favorabilityPresentationLayerOnly: true,
  driverRankingByAbsoluteResultDeltaContribution: true,
  doNotShowAllDeltasSimultaneouslyByDefault: true,
} as const;

/** Multiple scenarios per tenant/year — no hardcoded types. */
export const SCENARIO_COLLECTION_RULES = {
  multipleScenariosSupported: true,
  uniqueNamePerTenantFinanceYearAmongActive: true,
  optionalDescription: true,
  decorativeColorIconDeferred: true,
  ordering: "userSortOrder then updatedAt desc",
  noPreferredScenarioCompetingWithCurrentForecast: true,
  practicalSoftLimit: null,
} as const;

/**
 * Scenario → Current Forecast adoption (future FIN-04D-06 — not implemented in 04D-01):
 * explicit action creates formal forecast revision / new CURRENT — never silent overwrite.
 */
export const SCENARIO_TO_CURRENT_FORECAST_ADOPTION = {
  supportedInV1: false,
  futureExplicitActionGerman: "Als aktuelle Prognose übernehmen",
  createsFormalForecastRevision: true,
  provenanceModel: "FinanceScenarioAdoption",
  neverMutatesApprovedBudget: true,
  neverMutatesScenarioIntoGovernanceWithoutAction: true,
} as const;

/** Automatic forecast relationship — evidence/reference only in v1. */
export const SCENARIO_AUTOMATIC_FORECAST_BOUNDARY = {
  mayCompareAgainstAutomaticForecast: "deferred — secondary optional FIN-04D-04+",
  mayStartFromAutomaticForecast: false,
  automaticForecastInformsCreationSuggestions: "future AI assist only — not v1 engine",
  automaticForecastNeverChangesScenarioAssumptions: true,
  terminologyAvoidScenarioForecastCollision: true,
} as const;

/** Actuals relationship — hypothetical scenario; actual history stays truthful. */
export const SCENARIO_ACTUALS_BOUNDARY = {
  scenarioIsHypotheticalFullYearModel: true,
  baselineCarriesAsOfAndActualsThroughMetadata: true,
  newActualsDoNotSilentlyChangeFrozenBaseline: true,
  displayBaselineCutoffMetadata: true,
  fakeMonthlyPhasingForbidden: true,
} as const;

/** Timed cash / liquidity boundary (explicit non-scope). */
export const SCENARIO_TIMED_CASH_BOUNDARY = {
  v1AnnualForecastScenarioOnly: true,
  futureTimingAssumptionsPossible: true,
  blocksFin04Fin07Fin08Fin09: false,
  noPseudoMonthlyPhasing: true,
} as const;

/** Finance visual intelligence — decision-useful charts only; no FIN-wide redesign in 04D. */
export const SCENARIO_VISUAL_INTELLIGENCE_BOUNDARY = {
  conclusionsBeforeCharts: true,
  noDecorativeCharts: true,
  noFakePrecision: true,
  noFakePhasing: true,
  financeWideVisualPassDeferred: true,
} as const;

/** Permissions — reuse FORECASTING capability (FIN-04A/04B/04C pattern). */
export const SCENARIO_CAPABILITY_KEY = "FORECASTING" as const;

export const SCENARIO_PERMISSION_CONTRACT = {
  view: "finance.forecast.view",
  createEditDuplicateArchiveDelete: "finance.forecast.manage",
  compare: "finance.forecast.view",
  adoptToCurrentForecast: "finance.forecast.manage",
  adminImplied: "finance.admin",
} as const;

/** Route / navigation — inside Prognose workspace (muscle memory). */
export const SCENARIO_NAVIGATION_CONTRACT = {
  workspaceRoute: "/dashboard/finance/forecast",
  noSeparateTopLevelFinanceTab: true,
  primarySectionRemains: "Aktuelle Prognose",
  secondaryContext: "Szenarien",
  scenarioDetailRoutePattern: "/dashboard/finance/forecast/scenarios/[scenarioId]",
  stableLocationInsidePrognose: true,
} as const;

/** Conceptual UX architecture (FIN-04D-05 implements). */
export const SCENARIO_UX_ARCHITECTURE = {
  listAnswers: "What scenarios exist and what do they mean?",
  detailAnswers: [
    "managementQuestion",
    "expectedResult",
    "deltaVsBaseline",
    "assumptionDrivers",
    "accountEvidenceOnDemand",
  ] as const,
  creationFlow: "name → baseline confirm → add assumption → immediate result",
  notMiniSpreadsheetByDefault: true,
  tenSecondComprehensionTest: true,
  thirtySecondInvestigationTest: true,
  noMentalArithmeticTest: true,
  progressiveDisclosure: true,
  binaryControlCompliance: {
    newBinaryCheckboxes: 0,
    useTogglesForPersistentBinarySettings: true,
    useButtonsForProgressiveDisclosure: true,
    checkboxesOnlyForMultiRowSelection: true,
  },
} as const;

/** Optimistic concurrency (FIN-04D-02+ services). */
export const SCENARIO_CONCURRENCY_CONTRACT = {
  scenarioEditUsesUpdatedAtToken: true,
  assumptionEditUsesScenarioUpdatedAtToken: true,
  staleClientMustRefresh: true,
  adoptionVsEditRaceGuardedByExpectedScenarioUpdatedAt: true,
  rebaseVsEditRaceGuardedExplicitly: true,
  duplicateWhileEditAllowed: true,
  archiveWhileEditReturnsConflict: true,
} as const;

/** Safety / validation guards. */
export const SCENARIO_SAFETY_GUARDS = {
  assumptionTargetsSameTenantFinanceYear: true,
  invalidAccountRejected: true,
  selfComparisonForbidden: true,
  percentBoundsEnforced: "reject overflow beyond safe integer result",
  nanAndInfiniteRejected: true,
  amountLimitsUseAssertSafeAmountMinor: true,
  currencyConsistencyInsideScenario: true,
} as const;

/**
 * Proposed persistence (FIN-04D-02 — no migration in 04D-01).
 *
 * Dedicated scenario models — do not store scenarios as ordinary FinanceForecastVersion rows.
 * FIN-04A `scenarioKey` remains unused for canonical scenarios (reserved / legacy hook only).
 */
export const SCENARIO_PERSISTENCE_PROPOSAL = {
  migrationInFin04d01: false,
  models: {
    FinanceScenario: {
      fields: [
        "id",
        "tenantId",
        "financeYearId",
        "name",
        "description",
        "archivedAt",
        "sortOrder",
        "baselineReferenceKind",
        "baselineForecastVersionId",
        "baselineAsOfDate",
        "baselineActualsThroughDate",
        "baselineCurrency",
        "baselineOutdatedAt",
        "createdByUserId",
        "updatedByUserId",
        "createdAt",
        "updatedAt",
      ],
    },
    FinanceScenarioBaselineLine: {
      fields: ["id", "scenarioId", "financialAccountId", "amountMinor", "currency"],
      frozenAtCreation: true,
    },
    FinanceScenarioAssumption: {
      fields: [
        "id",
        "scenarioId",
        "financialAccountId",
        "kind",
        "percentBasisPoints",
        "amountMinorDelta",
        "absoluteAmountMinor",
        "note",
        "createdAt",
        "updatedAt",
      ],
    },
    FinanceScenarioResultLine: {
      fields: ["id", "scenarioId", "financialAccountId", "amountMinor", "currency"],
      optionalCache: true,
      derivedFrom: "baseline lines + assumptions",
    },
    FinanceScenarioAdoption: {
      fields: [
        "id",
        "scenarioId",
        "sourceScenarioUpdatedAt",
        "targetForecastVersionId",
        "appliedByUserId",
        "appliedAt",
      ],
      futurePackage: "FIN-04D-06",
    },
  },
  indexes: [
    "unique (tenantId, financeYearId, name) where archivedAt is null",
    "unique (scenarioId, financialAccountId) on assumptions",
  ],
  deletion: "hard delete scenario cascades baseline/assumptions/cache; blocked when adoption row exists",
} as const;

/** Integration map anchors (existing FIN modules). */
export const SCENARIO_INTEGRATION_MAP = {
  approvedBudget: "FIN-02 — secondary comparison only",
  actuals: "FIN-03 — metadata cutoff; no scenario mutation",
  currentForecast: "FIN-04A — primary baseline reference",
  automaticForecast: "FIN-04B — separate measure; optional future compare",
  rollingForecast: "FIN-04C — formal revisions do not rebase scenarios silently",
  comparisonPrimitives: "forecast-revision-comparison.ts delta = comparison − base",
  accountIdentity: "FinancialAccount.id",
  totals: "computeBudgetPlanningTotals / income expense result",
  permissions: "finance.forecast.view | finance.forecast.manage",
  workspaceRoute: "/dashboard/finance/forecast",
} as const;

/** German product terminology (tenant-facing). */
export const SCENARIO_GERMAN_PRODUCT_TERMS = {
  ...PROJECTION_GERMAN_PRODUCT_TERMS,
  scenariosSection: "Szenarien",
  createScenario: "Szenario erstellen",
  addAssumption: "Annahme hinzufügen",
  adoptToCurrentForecast: SCENARIO_TO_CURRENT_FORECAST_ADOPTION.futureExplicitActionGerman,
  rebaseToCurrentForecast: SCENARIO_STABILITY_POLICY.explicitRebaseFutureActionGerman,
} as const;

/** FIN-04D programme package sequence (FIN-04D-01 recommendation). */
export const SCENARIO_PACKAGE_PLAN = {
  "04D_01": "Scenario architecture & domain contract (this package)",
  "04D_02": "Persistence & scenario lifecycle (CRUD, archive, duplicate)",
  "04D_03": "Scenario calculation & assumption engine",
  "04D_04": "Scenario query & comparison layer",
  "04D_05": "Scenario workspace UX (Prognose → Szenarien)",
  "04D_06": "Explicit adoption & optional baseline rebase",
  "04D_07": "Hardening & release closure",
} as const;

/** AI / numerical boundary (aligned with FIN-04B). */
export const SCENARIO_AI_BOUNDARY = {
  canonicalNumericalEngine: "deterministic Finance scenario engine",
  llmNotCalculator: true,
  llmMayExplainOrSuggestAssumptions: true,
  noUserSelectableAiAlgorithm: true,
} as const;
