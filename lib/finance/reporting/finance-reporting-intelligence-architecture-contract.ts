/**
 * SCE Finance FIN-05A — Financial Reporting & Intelligence architecture contract.
 *
 * Pure types/constants — no Prisma migrations, reporting UI, charts, variance engine
 * implementation, publication snapshots, liquidity, or statutory accounting in FIN-05A.
 *
 * Principle: Complexity should exist in the system, not in the user's head.
 *
 * @see docs/finance/SCE-FINANCE-05-FINANCIAL-REPORTING-INTELLIGENCE-ARCHITECTURE.md
 */

import {
  MANAGEMENT_INCOME_STATEMENT_MODEL,
  PROPOSED_FINANCE_PERMISSION_KEYS,
  SCE_FINANCE_PRODUCT_LOCKS,
} from "@/lib/finance/finance-architecture";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";
import { FINANCE_NAIVE_MONTH_PRORATION_FORBIDDEN } from "@/lib/finance/forecast/scenario-architecture-contract";
import {
  SCE_MEASURE_ACTUAL,
  SCE_MEASURE_APPROVED_BUDGET,
  SCE_MEASURE_CURRENT_FORECAST,
  SCE_MEASURE_SCE_PROJECTION,
  SCE_MEASURE_SCENARIO,
} from "@/lib/finance/projection/projection-architecture-contract";
import { FINANCE_AMOUNT_STORAGE } from "@/lib/finance/money-types";

/** FIN-05 programme product principle (locked in architecture). */
export const FINANCE_REPORTING_PRODUCT_PRINCIPLE =
  "COMPLEXITY SHOULD EXIST IN THE SYSTEM, NOT IN THE USER'S HEAD." as const;

/** Programme UX principle applied to reporting (FIN-04C+). */
export const FINANCE_REPORTING_SCE_UX_PRINCIPLE =
  "SIMPLE UNDERSTANDING. SHALLOW NAVIGATION. DEEP CAPABILITY." as const;

/** Default information hierarchy for reporting surfaces. */
export const FINANCE_REPORTING_INFORMATION_ARCHITECTURE = [
  "INTERPRETATION",
  "EXCEPTION",
  "EXPLANATION",
  "EVIDENCE",
] as const;

/** Equivalent compression: conclusion → why → detail. */
export const FINANCE_REPORTING_INFORMATION_ARCHITECTURE_ALIASES = [
  "CONCLUSION",
  "WHY",
  "DETAIL",
] as const;

/** Comprehension targets (architecture — not automated UX tests in FIN-05A). */
export const FINANCE_REPORTING_COMPREHENSION_TARGETS = {
  tenSecondComprehensionTest:
    "A club board member should understand the important financial situation within approximately ten seconds.",
  thirtySecondInvestigationTest:
    "Within approximately thirty seconds the user should identify the main reason for a meaningful variance and reach supporting detail.",
  noMentalArithmetic:
    "SCE calculates and explains meaningful differences; users must not compare several numbers manually to infer conclusions.",
} as const;

/** Machine-testable architecture locks (FIN-05A). */
export const SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS = {
  reportingIsNotSourceOfTruth: true,
  approvedBudgetRemainsGovernanceBaseline: true,
  currentForecastRemainsOrganisationExpectation: true,
  automaticForecastRemainsSystemProjection: true,
  scenarioRemainsHypotheticalUntilAdoption: true,
  expectedFinancialTimingIsEvidenceNotRecognition: true,
  noFakeMonthlyPhasing: FORECAST_PHASING_SUPPORTED === false,
  noNaiveMonthProration:
    FINANCE_NAIVE_MONTH_PRORATION_FORBIDDEN.forbiddenWithoutExplicitEvenDistributionEvidence,
  noLiquidityInFin05: true,
  managementPnlIsNotStatutoryAccounting: true,
  noAssetLiabilityEquityInFin05Reporting: true,
  varianceDirectionIsSemantic: true,
  noHardcodedCurrency: true,
  countryAgnostic: SCE_FINANCE_PRODUCT_LOCKS.countryAgnosticCore,
  sportAgnostic: SCE_FINANCE_PRODUCT_LOCKS.sportAgnostic,
  organisationAgnostic: SCE_FINANCE_PRODUCT_LOCKS.organisationAgnostic,
  teamNotRequired: !SCE_FINANCE_PRODUCT_LOCKS.teamRequiredForFinance,
  integerMinorUnits: FINANCE_AMOUNT_STORAGE.representation === "AMOUNT_MINOR_INTEGER",
  overviewIsInterpretive: true,
  reportingIsAnalytical: true,
  zeitplanungIsManagementWorkspace: true,
  budgetIsPlanGovern: true,
  actualIsRecordMeasure: true,
  forecastIsExpectReforecast: true,
  einrichtungIsConfigure: true,
  publicationDeferredToFin06: true,
  balanceSheetDeferredToFin11: true,
  liveReportingDistinctFromPublishedSnapshot: true,
  numericalExplanationDeterministicNotLlm: true,
  llmMayAssistNaturalLanguageOnly: true,
  configurableOrganisationalReportingHierarchy: true,
  hardcodedManagementPnlCategoriesForbidden: true,
  noGenericBiFilterBuilderInFin05: true,
  noNewChartLibraryInFin05A: true,
} as const;

/** Finance workspace responsibility model (German nav labels = tenant-facing examples). */
export const FINANCE_WORKSPACE_RESPONSIBILITY_MODEL = {
  UEBERSICHT: {
    navKey: "overview",
    verb: "UNDERSTAND",
    answers: [
      "Where do we currently stand?",
      "Are we broadly on track?",
      "What changed?",
      "What requires attention?",
      "What should I investigate?",
    ],
    selectiveNotExhaustive: true,
    notDashboardOfEveryChart: true,
  },
  BUDGET: {
    navKey: "budget",
    verb: "PLAN / GOVERN",
    ownsApprovedBaselineWorkflow: true,
    notPrimaryVarianceAnalysisSurface: true,
  },
  IST: {
    navKey: "actuals",
    verb: "RECORD / MEASURE",
    actualRemainsAuthoritativeTruth: true,
  },
  PROGNOSE: {
    navKey: "forecast",
    verb: "EXPECT / REFORECAST",
    includesScenariosSubContext: true,
  },
  ZEITPLANUNG: {
    navKey: "forecast/timing",
    verb: "MANAGE EXPECTED TIMING EVIDENCE",
    isInputAndMaintenanceWorkspace: true,
    largeMovementChartNotPrimarySurface: true,
    fin04eMovementChartNotMountedOnZeitplanung: true,
  },
  REPORTING: {
    navKey: "reports",
    verb: "ANALYSE / EXPLAIN / PRESENT",
    deeperAnalyticalControlsAllowed: true,
    avoidsDuplicatingFullOverviewExperience: true,
  },
  EINRICHTUNG: {
    navKey: "structure",
    verb: "CONFIGURE",
    structureAndCapabilitiesNotAnalysis: true,
  },
} as const;

/** Boundary between Übersicht and Reporting (locked). */
export const FINANCE_UBERSICHT_VS_REPORTING_BOUNDARY = {
  ubersichtRole: "INTERPRETIVE_SUMMARY_AND_ATTENTION_ROUTING",
  reportingRole: "ANALYTICAL_INVESTIGATION_AND_EVIDENCE",
  ubersichtMaySurfaceSmallNumberOfDrivers: true,
  reportingOwnsAccountAndDimensionDrilldown: true,
  duplicateFullPnlWorkspaceOnBothForbidden: true,
} as const;

/** Drill-through patterns (architecture — implementation in FIN-05D/E). */
export const FINANCE_REPORTING_DRILL_THROUGH_PATTERNS = [
  { from: "UEBERSICHT", to: "REPORTING", purpose: "Investigate variance or result drivers" },
  { from: "UEBERSICHT", to: "BUDGET", purpose: "Governance context for approved baseline" },
  { from: "UEBERSICHT", to: "PROGNOSE", purpose: "Organisation expectation context" },
  { from: "UEBERSICHT", to: "ZEITPLANUNG", purpose: "Maintain timing evidence — not primary analysis" },
  { from: "REPORTING", to: "ACCOUNT_EVIDENCE", purpose: "Posting / line / account detail" },
  { from: "REPORTING", to: "DIMENSION_EVIDENCE", purpose: "Cost center / optional dimension rollup" },
] as const;

/**
 * Canonical reporting measures — definitions only in FIN-05A.
 * Implementation via measure providers (FIN-01E pattern) in FIN-05B+.
 */
export const FINANCE_REPORTING_CANONICAL_MEASURES = {
  APPROVED_BUDGET: {
    sceMeasure: SCE_MEASURE_APPROVED_BUDGET,
    source: "Approved FinanceBudgetVersion lines (governance baseline)",
    grain: "FinanceYear + FinancialAccount (annual amountMinor)",
    signSemantics: "Positive magnitude on account; INCOME/EXPENSE from canonicalSemantic",
    comparisonRole: "Governance baseline for variance and forecast gap",
    missingData: "Explicit unavailable — never substitute draft budget",
    currency: "Version/base currency frozen at approval where applicable",
    period: "Full finance year unless explicit period-to-date slice added with valid evidence",
    aggregationValid: "Sum within same semantic (income/expense) and currency only",
  },
  ACTUAL: {
    sceMeasure: SCE_MEASURE_ACTUAL,
    source: "FIN-03B recorded postings / periodic actuals",
    grain: "FinanceYear + FinancialAccount (+ optional period slice when supported)",
    signSemantics: "Same as budget — semantic-aware result math",
    comparisonRole: "Measured truth vs budget and vs forecast context",
    missingData: "Partial history allowed — conclusions scoped to available periods",
    currency: "Tenant base currency; no silent FX in FIN-05",
    period: "YTD / selected period when resolver provides valid boundaries",
    aggregationValid: "Only across compatible period and currency scope",
  },
  CURRENT_FORECAST: {
    sceMeasure: SCE_MEASURE_CURRENT_FORECAST,
    source: "FinanceForecast.currentVersionId → CURRENT version lines",
    grain: "FinanceYear + FinancialAccount annual amountMinor",
    signSemantics: "Organisation-owned expectation — not rewritten by reporting",
    comparisonRole: "Primary expectation vs budget and vs actual-to-date context",
    missingData: "No current forecast → forecast comparisons unavailable",
    currency: "Forecast version currency context",
    period: "Annual full-year expectation (FIN-04A grain)",
    aggregationValid: "Same as approved budget rollup rules",
  },
  AUTOMATIC_FORECAST: {
    sceMeasure: SCE_MEASURE_SCE_PROJECTION,
    source: "FIN-04B projection engine output",
    grain: "FinanceYear + FinancialAccount annual published projection",
    signSemantics: "System projection — distinct from organisation forecast",
    comparisonRole: "Reference / evidence — not silent replacement for current forecast",
    missingData: "Null line amounts when insufficient evidence (FIN-04B)",
    currency: "Projection version currency",
    period: "Annual published grain only",
    aggregationValid: "Same hierarchy rollup as other annual measures",
  },
  SCENARIO: {
    sceMeasure: SCE_MEASURE_SCENARIO,
    source: "FIN-04D frozen scenario results",
    grain: "FinanceYear + FinancialAccount full-year calculated lines",
    signSemantics: "Hypothetical — not current forecast until adoption",
    comparisonRole: "What-if vs baseline — reporting must label as scenario",
    missingData: "Archived or missing scenario excluded from live overview defaults",
    currency: "Scenario baseline currency snapshot",
    period: "Annual only in v1",
    aggregationValid: "Deterministic engine output only",
  },
  VARIANCE_ACTUAL_VS_BUDGET: {
    formula: "rawDeltaMinor = actualMinor - budgetMinor; favorability from canonicalSemantic",
    centralImplementation: "lib/finance/actual/variance-semantics.ts (FIN-03A — reuse in FIN-05B)",
    scatterSignInversionInReactForbidden: true,
  },
  FORECAST_VARIANCE_VS_BUDGET: {
    formula: "forecastMinor - approvedBudgetMinor at account grain; favorability uses same semantic rules as actual variance",
    label: "Current Forecast vs Approved Budget",
  },
  ACTUAL_VS_FORECAST: {
    whenUseful: "Mid-year tracking — actual-to-date vs remaining forecast expectation",
    requiresExplicitPeriodSemantics: true,
    noImplicitAnnualisation: true,
  },
  REMAINING_EXPECTATION: {
    definition: "Current Forecast full-year amount minus realized Actual where period semantics valid",
    notFakePhasing: true,
  },
  EXPECTED_FINANCIAL_TIMING_COVERAGE: {
    source: "FIN-04E reconciliation and timing read model",
    role: "Coverage / exception signpost — not accounting recognition",
    notBudgetPhasing: true,
  },
  INCOME: {
    definition: "Rollup of INCOME canonicalSemantic accounts in reporting hierarchy",
  },
  EXPENSE: {
    definition: "Rollup of EXPENSE canonicalSemantic accounts in reporting hierarchy",
  },
  MANAGEMENT_RESULT: {
    formula: "INCOME totalMinor - EXPENSE totalMinor",
    alias: "Management Result / Operating surplus-deficit",
    notStatutoryNetIncome: true,
  },
} as const;

/** Management P&L / Erfolgsrechnung architecture (not FIN-11 statutory). */
export const FINANCE_MANAGEMENT_PNL_ARCHITECTURE = {
  model: "MANAGEMENT_INCOME_STATEMENT_OVER_REPORTING_HIERARCHY",
  primarySemantics: MANAGEMENT_INCOME_STATEMENT_MODEL.primarySemanticsForV1,
  computedLineKinds: MANAGEMENT_INCOME_STATEMENT_MODEL.computedLineKinds,
  hierarchySource: "Tenant FinancialReportingGroup + FinancialAccount tree (FIN-01C)",
  exampleCategoriesAreIllustrativeOnly: true,
  hardcodedCategoryTreeForbidden: true,
  statutoryChartOfAccountsForbidden: true,
  fin11BalanceSheetBoundary: true,
} as const;

/** Variance intelligence — semantic direction centralized (extend FIN-03A in FIN-05B). */
export const FINANCE_VARIANCE_INTELLIGENCE_MODEL = {
  absoluteVarianceMinor: "Signed or raw delta per measure pair — documented per comparison",
  percentageVariance: "Only when baseline non-zero and both sides exist",
  favorableUnfavorable: "Derived from canonicalSemantic — not raw sign alone",
  materialNonMaterial: "Prioritisation label — never deletes underlying evidence",
  zeroBaselinePercent: "null — no divide-by-zero artifacts",
  negativeBaselinePercent: "null unless explicitly supported comparison",
  missingBaselinePercent: "null",
  verySmallBaseline: "Percent may be suppressed when policy marks misleading",
  integerArithmetic: true,
  doubleInversionForbidden: true,
  reactComponentSignInversionForbidden: true,
} as const;

/** Materiality contract — policy hooks only in FIN-05A. */
export const FINANCE_MATERIALITY_MODEL = {
  purpose: "Focus attention — not hide data",
  defaultBehavior: "Rank and label using relative magnitude when no org policy configured",
  futurePolicyKinds: [
    "ABSOLUTE_THRESHOLD",
    "PERCENT_THRESHOLD",
    "COMBINED_THRESHOLD",
    "ORGANISATION_CONFIGURABLE",
    "CONTEXT_SENSITIVE",
  ],
  hardcodedUniversalChfThresholdForbidden: true,
  configurationUiDeferred: true,
} as const;

/** Period intelligence — valid vs invalid comparisons. */
export const FINANCE_REPORTING_PERIOD_SEMANTICS = {
  financeYear: "Primary scope — tenant-defined boundaries",
  yearToDate: "Allowed when actual period resolver and cutoff metadata exist",
  selectedPeriod: "Allowed when measure provider exposes compatible grain",
  monthQuarterTrend: "Only when genuine time-series evidence exists",
  comparisonToApprovedAnnualBaseline: "Valid at annual grain",
  comparisonToPriorPeriods: "Valid only with consistent measure and calendar/finance-year rules",
  fakeMonthlyBudgetFromAnnualDivideBy12Forbidden: true,
  fakeMonthlyForecastFromAnnualDivideBy12Forbidden: true,
  expectedTimingIsNotBudgetPhasing: true,
  expectedTimingIsNotAccountingRecognition: true,
} as const;

/** Visual intelligence families — decision-first, not chart gallery. */
export const FINANCE_VISUAL_INTELLIGENCE_FAMILIES = {
  BUDGET_ACTUAL_FORECAST_COMPARISON: {
    decisionQuestion: "Where are we expected to finish relative to the approved plan?",
    candidates: ["bullet_chart", "variance_bar", "grouped_comparison", "compact_comparison_strip"],
  },
  INCOME_EXPENSE_COMPOSITION: {
    decisionQuestion: "What drives the result?",
    candidates: ["ranked_bars", "hierarchical_contribution", "waterfall_when_mathematically_valid"],
    avoidDefaultPieDonutProliferation: true,
  },
  VARIANCE_CONTRIBUTION: {
    decisionQuestion: "Which accounts explain the difference?",
    candidates: ["ranked_diverging_variance_bars", "waterfall"],
  },
  FINANCIAL_MOVEMENTS_OVER_TIME: {
    decisionQuestion: "When are meaningful expected movements anticipated?",
    reuseFin04eR4MovementModelWhenAppropriate: true,
    mountOnlyWhenTimingEvidenceMeaningful: true,
    notAutomaticOnEveryPage: true,
  },
  TREND: {
    decisionQuestion: "How did measures evolve over valid time buckets?",
    requiresGenuineTimeSeries: true,
    noFabricatedTrendFromSingleAnnualValue: true,
  },
  FORECAST_EVOLUTION: {
    decisionQuestion: "How did organisation expectation change between formal forecast versions?",
    source: "FIN-04C forecast version history",
    deferredImplementation: "FIN-05F",
  },
  LIQUIDITY: {
    owner: "FIN-09",
    notFin05: true,
  },
} as const;

/** Finance Übersicht visual direction (restrained — not implemented in FIN-05A). */
export const FINANCE_OVERVIEW_VISUAL_INTELLIGENCE_DIRECTION = {
  narrativeOverCardSoup: true,
  proposedSections: [
    "FINANCIAL_POSITION_OR_EXPECTED_RESULT",
    "WHAT_NEEDS_ATTENTION",
    "KEY_DRIVERS",
    "EXPECTED_MOVEMENTS_WHEN_MEANINGFUL",
    "DRILL_DOWN_ROUTES",
  ],
  evaluateExistingOverviewBeforeLockingLayout: true,
  movementChartPrimaryConsumerIsOverviewNotZeitplanung: true,
} as const;

/** Explainability chain for significant conclusions. */
export const FINANCE_REPORTING_EXPLAINABILITY_MODEL = {
  chain: ["CONCLUSION", "CONTRIBUTING_FACTORS", "SOURCE_EVIDENCE"],
  deterministicNumericalExplanationRequired: true,
  llmOptionalNaturalLanguageLayer: true,
  llmMustNotInventCalculations: true,
} as const;

/** Dimensional analysis — optional dimensions, no team requirement. */
export const FINANCE_REPORTING_DIMENSION_MODEL = {
  teamRequired: false,
  optionalTypedKinds: [
    "ORG_UNIT",
    "TEAM_OR_GROUP",
    "PERSON",
    "ACTIVITY",
    "CLUB_EVENT",
    "FINANCE_PROJECT",
    "FACILITY_RESOURCE",
    "FUND",
    "FUNDING_SOURCE",
    "FINANCE_COST_CENTER",
    "CUSTOM",
  ],
  filtering: "Progressive — default annual org-wide management view",
  grouping: "By selected dimension when evidence exists",
  drillDown: "Reporting workspace — not unbounded BI explorer",
  missingDimensionBehavior: "Show unassigned bucket — do not fabricate allocation",
  genericBiToolForbidden: true,
} as const;

/** Publication boundary (FIN-06). */
export const FINANCE_REPORTING_PUBLICATION_BOUNDARY = {
  liveReportingView: "Mutable as source data changes — mode LIVE (FIN-01E)",
  publishedReportSnapshot: "Versioned auditable stable artifact — FIN-06",
  fin05DefinesIntelligenceOnly: true,
  fin06OwnsShareAndPublish: true,
  viewDoesNotImplyShareOrPublish: true,
} as const;

/** Permissions — reuse finance.view baseline; optional future reporting.export. */
export const FINANCE_REPORTING_PERMISSION_MODEL = {
  primaryView: PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_VIEW,
  measureScopedViews: {
    budget: PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_BUDGET_VIEW,
    actual: PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_ACTUAL_VIEW,
    forecast: PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_FORECAST_VIEW,
  },
  proposedFutureReportingView: "finance.reporting.view",
  introduceOnlyIfFinanceViewInsufficient: true,
  share: "FIN-06 — not implied by view",
  publish: "FIN-06 — not implied by view",
  configure: PROPOSED_FINANCE_PERMISSION_KEYS.FINANCE_STRUCTURE_MANAGE,
  viewDoesNotImplyConfigure: true,
} as const;

/** Read-model architecture (presentation-neutral server models). */
export const FINANCE_REPORTING_READ_MODEL_ARCHITECTURE = {
  principle: "DO THE EXPENSIVE WORK ONCE. SERVE THE RESULT MANY TIMES. (SCE-SCALE-01 alignment)",
  reactPrimarilyRenders: true,
  noUnboundedClientAggregation: true,
  noNPlusOnePerRowPattern: true,
  existingFoundation: "FinancialReportingReadModel (FIN-01E — APPROVED_BUDGET)",
  proposedModels: [
    "FinanceManagementOverviewReadModel",
    "FinanceManagementPnlReadModel",
    "FinanceVarianceAnalysisReadModel",
    "FinanceReportingDrilldownReadModel",
    "FinanceComparativeMeasuresReadModel",
  ],
  speculativeCacheInfrastructureInFin05A: false,
} as const;

/** Currency / locale separation (locked). */
export const FINANCE_REPORTING_CURRENCY_LOCALE_MODEL = {
  currencyIdentitySeparateFromFormattingLocale: true,
  translationLocaleSeparateFromNumberFormat: true,
  noHardcodedChf: true,
  noHardcodedDeCh: true,
  noCountryInferenceFromCurrency: true,
  integerMinorUnitsForCalculation: true,
  aggregationSameCurrencyOnly: true,
} as const;

/** Responsive / accessibility expectations. */
export const FINANCE_REPORTING_RESPONSIVE_ACCESSIBILITY = {
  interpretivePriorityOnSmallScreens: true,
  exceptionsBeforeRawTablesOnMobile: true,
  chartsRequireTextualEquivalent: true,
  colorNeverSoleIndicatorForVarianceOrRisk: true,
} as const;

/** Incomplete data states — do not fabricate conclusions. */
export const FINANCE_REPORTING_INCOMPLETE_DATA_BEHAVIOR = {
  noBudget: "Budget comparisons unavailable — state explicitly",
  noActual: "Actual sections unavailable or partial",
  noCurrentForecast: "Forecast variance unavailable",
  partialActualHistory: "Scope conclusions to available periods",
  missingReportingHierarchy: "Structure setup required — FIN-01C path",
  archivedAccounts: "Historical amounts remain addressable by id",
  missingDimensions: "Unassigned — no silent allocation",
  zeroBaseline: "Percent variance null",
  incompleteTimingEvidence: "Timing visuals suppressed or marked partial",
  forecastLineMissing: "Account omitted from comparison — not zero-filled as forecast",
  overallocatedExpectedTiming: "Surface reconciliation exception — FIN-04E",
  ambiguousExpectedTiming: "Do not coerce to exact dates",
} as const;

/** FIN-11 boundary restatement for FIN-05. */
export const FINANCE_REPORTING_FIN11_BOUNDARY = {
  notProvided: [
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "double_entry_bookkeeping",
    "journal_entries",
    "general_ledger",
    "balance_sheet_recognition",
    "statutory_chart_of_accounts",
    "country_specific_accounting_rules",
    "tax_accounting",
    "vat_reporting",
  ],
  managementPnlScope: "INCOME and EXPENSE operating model only",
} as const;

/** FIN-05 implementation decomposition (FIN-05A recommendation). */
export const FINANCE_05_PACKAGE_PLAN = {
  "05A": "Reporting & Intelligence Architecture (this package)",
  "05B": "Management Reporting Read Models & Variance Engine",
  "05C": "Management P&L / Erfolgsrechnung presentation",
  "05D": "Finance Übersicht & Decision Intelligence",
  "05E": "Reporting Workspace & Drill-down",
  "05F": "Forecast / Budget / Actual Comparative Intelligence",
  "05G": "Reporting Visual Intelligence & Responsive Hardening",
  "05H": "Release Hardening & Closure",
  visualIntelligenceFollowsReadModels: true,
  chartsNotDisconnectedDecorativePackage: true,
} as const;

/** FIN-05A scope guard. */
export const FINANCE_05A_SCOPE = {
  architectureDocsAndContractsOnly: true,
  noFullReportingUi: true,
  noStatutoryAccounting: true,
  noLiquidity: true,
  noFin04eReopen: true,
  binaryControlComplianceExpected: true,
} as const;

/** FIN-05B implementation locks — management reporting read models & variance engine. */
export const SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS = {
  reportingReadModelsArePresentationNeutral: true,
  readModelsDoNotOwnSourceTruth: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.reportingIsNotSourceOfTruth,
  approvedBudgetAuthorityPreserved: true,
  currentForecastPointerAuthorityPreserved: true,
  actualAuthorityPreserved: true,
  varianceCalculationCentralised: true,
  varianceCentralImplementationPath: "lib/finance/actual/variance-semantics.ts",
  varianceFavourabilityIsSemantic: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.varianceDirectionIsSemantic,
  zeroBaselinePercentageIsUnavailable: true,
  missingIsNotZero: true,
  moneyUsesIntegerMinorUnits: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.integerMinorUnits,
  managementResultIsIncomeMinusExpense: true,
  managementResultIsNotStatutoryNetIncome: true,
  noFakeMonthlyPhasing: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing,
  noExpectedEventDuplicationInFin05B: true,
  noLiquidityInFin05: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noLiquidityInFin05,
  noAssetLiabilityEquityInFin05: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noAssetLiabilityEquityInFin05Reporting,
  teamNotRequired: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.teamNotRequired,
  countryAgnostic: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.countryAgnostic,
  sportAgnostic: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.sportAgnostic,
  tenantIsolationRequired: true,
  permissionAwareComposition: true,
  deterministicExplanationDrivers: true,
  noLlmForNumericalExplanation: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.numericalExplanationDeterministicNotLlm,
  noGenericBiEngine: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noGenericBiFilterBuilderInFin05,
  noNPlusOneReportingReadModel: true,
  financeComparativeMeasuresReadModelConsolidatedIntoVarianceAnalysis: true,
} as const;

export const FINANCE_05B_IMPLEMENTATION = {
  varianceEngineModule: "lib/finance/reporting/build-variance-reporting-tree.ts",
  managementOverviewReadModel: "FinanceManagementOverviewReadModel",
  varianceAnalysisReadModel: "FinanceVarianceAnalysisReadModel",
  queryService: "lib/finance/services/finance-management-reporting-query-service.ts",
  supportedComparisons: [
    "ACTUAL_VS_APPROVED_BUDGET",
    "CURRENT_FORECAST_VS_APPROVED_BUDGET",
  ] as const,
  unsupportedComparisons: [
    "ACTUAL_VS_CURRENT_FORECAST",
    "ACTUAL_YTD_VS_ANNUAL_APPROVED_BUDGET",
  ] as const,
} as const;
