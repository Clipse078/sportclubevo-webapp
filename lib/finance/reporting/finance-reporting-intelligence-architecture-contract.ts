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
  fin05bMergedOnStageCommit: "1cad40593191ebb88d91e5a41aab82a438130a2d",
  fin05bStatus: "COMPLETE_ON_STAGE",
} as const;

/** FIN-05C implementation locks — Management P&L / Erfolgsrechnung. */
export const SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS = {
  managementPnlUsesFin05bPrimitives: true,
  managementPnlIsPresentationNeutralAtReadModelLayer: true,
  managementPnlDerivesFromConfiguredHierarchy: true,
  managementPnlReconcilesToCompleteSourceTotals: true,
  unassignedFinancialValuesMustNotDisappear: true,
  unassignedResidualDoesNotMutateHierarchy: true,
  archivedHistoricalValuesRemainReportable: true,
  approvedBudgetRemainsBaseline: true,
  currentForecastRemainsOrganisationExpectation: true,
  missingIsNotZero: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.missingIsNotZero,
  unauthorizedIsNotZero: true,
  varianceFavourabilityIsSemantic:
    SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.varianceFavourabilityIsSemantic,
  noFakeMonthlyPhasing: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing,
  managementResultIsIncomeMinusExpense:
    SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.managementResultIsIncomeMinusExpense,
  managementPnlIsNotStatutoryAccounting:
    SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.managementPnlIsNotStatutoryAccounting,
  noLiquidityInFin05: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noLiquidityInFin05,
  teamNotRequired: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.teamNotRequired,
  countryAgnostic: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.countryAgnostic,
  sportAgnostic: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.sportAgnostic,
  integerMinorUnits: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.moneyUsesIntegerMinorUnits,
  noReactFinancialRecalculation: true,
  noNPlusOnePnl: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noNPlusOneReportingReadModel,
  fin05dFinanceUbersichtNotImplemented: false,
  fin05eDrilldownNotImplemented: true,
} as const;

/** FIN-05D implementation locks — Finance Übersicht decision intelligence. */
export const SCE_FINANCE_REPORTING_05D_ARCHITECTURE_LOCKS = {
  overviewIsInterpretive: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.overviewIsInterpretive,
  overviewIsNotSourceOfTruth: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.reportingIsNotSourceOfTruth,
  overviewAnswersWhatMattersNow: true,
  overviewUsesCanonicalManagementReadModels: true,
  approvedBudgetAuthorityPreserved: true,
  actualAuthorityPreserved: true,
  currentForecastAuthorityPreserved: true,
  automaticForecastIsNotCurrentForecast: true,
  varianceFavourabilityIsSemantic:
    SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.varianceFavourabilityIsSemantic,
  missingIsNotZero: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.missingIsNotZero,
  unauthorizedIsNotZero: SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS.unauthorizedIsNotZero,
  noFakeMonthlyPhasing: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing,
  actualCutoffIsExplicit: true,
  expectedEventsAreTemporalEvidence: true,
  expectedMovementIsNotLiquidity: true,
  timingCoverageIsNotForecastConfidence: true,
  unscheduledEventsAreNotFakePlotted: true,
  noGenericBiEngine: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noGenericBiEngine,
  noChartGallery: true,
  noLlmNumericalEngine: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noLlmForNumericalExplanation,
  teamNotRequired: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.teamNotRequired,
  countryAgnostic: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.countryAgnostic,
  sportAgnostic: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.sportAgnostic,
  tenantIsolationRequired: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.tenantIsolationRequired,
  permissionAwareComposition: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.permissionAwareComposition,
  noNPlusOneOverview: true,
  integerMinorUnits: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.moneyUsesIntegerMinorUnits,
  overviewUsesCompactEventTimeline: true,
  /** FIN-04E R4 movement chart remains available for Zeitplanung — not Übersicht primary visual. */
  movementChartReusesFin04eR4InTimingWorkspace: true,
  /** Presentation-only; not a domain materiality threshold. */
  noUniversalUntimedPercentMaterialityRule: true,
  /** Running cash balance line/area reserved for FIN-09 liquidity semantics. */
  lineChartReservedForContinuousBalanceFin09: true,
  /**
   * Current Übersicht uses a compact event timeline; future packages may choose
   * period movement profiles when the financial question and timing precision allow.
   */
  overviewCurrentImplementationIsCompactEventTimeline: true,
} as const;

/**
 * FIN-05H — visualization follows the financial question while preserving data semantics.
 * Replaces any rigid "discrete events → timeline only" documentation rule.
 */
export const FINANCE_EXPECTED_MOVEMENT_VISUALIZATION_PRINCIPLE = {
  financialQuestionDrivesVisual: true,
  discreteExpectedMovements: {
    allowedForms: [
      "EVENT_TIMELINE",
      "CALENDAR",
      "PERIOD_MOVEMENT_PROFILE",
      "EVENT_LIST",
    ] as const,
    forbiddenImplications: [
      "FABRICATE_TIMING_PRECISION",
      "FABRICATE_MONTHLY_PHASING",
      "IMPLY_RUNNING_BALANCE",
      "IMPLY_LIQUIDITY",
      "IMPLY_ACCOUNTING_RECOGNITION",
    ] as const,
  },
  continuousAuthoritativeValueOverTime: {
    allowedForms: ["LINE", "AREA"] as const,
    requiresSemanticValidity: true,
  },
  categoryMagnitude: { allowedForms: ["BAR"] as const },
  varianceContribution: {
    allowedForms: ["RANKED_COMPARISON", "DIVERGING_BAR", "DIRECT_LIST"] as const,
  },
  overviewCurrentImplementation: "COMPACT_EVENT_TIMELINE",
  timelineNotExclusiveFutureEvolution: true,
  /** Locked question for expected financial movements (FIN-05H closure). */
  expectedFinancialMovementsQuestion:
    "What financial movements are expected, and when?",
  doNotConnectEventsWithLine: true,
  doNotPresentEventTimelineAsLiquidity: true,
  fin09LiquidityQuestion: "How much liquidity do we expect to have over time?",
} as const;

/**
 * FIN-05H — Product Owner visual benchmark (design direction for FIN-06+, not a FIN-05H redesign).
 * Reference workspaces: Szenarien + Zeitplanung. Standardise design grammar, not identical layouts.
 */
export const FINANCE_VISUAL_BENCHMARK = {
  referenceWorkspaces: ["SCENARIOS", "ZEITPLANUNG"] as const,
  designGrammarNotUniversalPageTemplate: true,
  characteristics: [
    "SPACIOUS_COMPOSITION",
    "STRONG_TYPOGRAPHY_WHITESPACE_HIERARCHY",
    "FEWER_COMPETING_CONTAINERS",
    "RESTRAINED_BORDERS_AND_CHROME",
    "DARK_TRANSLUCENT_WORKING_SURFACES",
    "ONE_DOMINANT_QUESTION_PER_ZONE",
    "PROGRESSIVE_DISCLOSURE",
    "CLEAR_NAV_CONTEXT_INTERPRETATION_CONTENT",
    "LARGE_VALUES_ONLY_WHEN_PRIMARY_ANSWER",
    "AVOID_GENERIC_DASHBOARD_CARD_GRID",
    "AVOID_CARD_SOUP_NESTED_PANELS",
    "CALM_DENSITY_WITH_DEEP_CAPABILITY",
  ] as const,
  lockedInterpretation: {
    zeitplanungMayUseDominantAmount: true,
    finanzstrukturNoArtificialHeroKpi: true,
    reportingPreservesAnalyticalDensity: true,
    actualsMayRequireEvidenceTables: true,
    budgetRequiresGovernanceVersionContext: true,
  },
  sceProductPrinciple:
    "COMPLEXITY SHOULD EXIST IN THE SYSTEM, NOT IN THE USER'S HEAD.",
  guidesFin06Onward: true,
  fin05hRedesignForbidden: true,
} as const;

/** FIN-09 design note (documentation lock — not implemented in FIN-05D). */
export const SCE_FINANCE_09_LIQUIDITY_VISUAL_DESIGN_NOTE = {
  primaryVisual: "RUNNING_CASH_BALANCE_LINE_OR_SUBTLE_AREA",
  composition: "openingCashBalance + expectedCashInflows - expectedCashOutflows = projectedRunningBalance",
  timeAxis: "X",
  balanceAxis: "Y",
  expectedEventTimelineIsNotLiquidity: true,
  implementedInFin05d: false,
} as const;

export const FINANCE_05D_IMPLEMENTATION = {
  decisionIntelligenceReadModel: "FinanceOverviewDecisionIntelligenceReadModel",
  queryLoader: "loadFinanceOverviewDecisionIntelligenceReadModel",
  workspaceRoute: "/dashboard/finance",
  maxDriversPerSide: 3,
  fin05dStatus: "COMPLETE_PO_UAT_PASS",
  fin05eStatus: "COMPLETE_PO_UAT_PASS",
} as const;

/** FIN-05E implementation locks — reporting workspace drill-down. */
export const SCE_FINANCE_REPORTING_05E_ARCHITECTURE_LOCKS = {
  reportingIsNotSourceOfTruth: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.reportingIsNotSourceOfTruth,
  reportingIsAnalyseExplainPresent: true,
  approvedBudgetRemainsGovernanceBaseline: true,
  currentForecastRemainsOrganisationExpectation: true,
  automaticForecastDoesNotReplaceCurrentForecast: true,
  actualEvidenceRemainsCanonical: true,
  managementPnlIsNotStatutoryAccounting:
    SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.managementPnlIsNotStatutoryAccounting,
  noAssetLiabilityEquityInFin05:
    SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noAssetLiabilityEquityInFin05Reporting,
  noLiquidityInFin05: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noLiquidityInFin05,
  expectedEventsAreNotLiquidity: true,
  noFakeMonthlyPhasing: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing,
  missingIsNotZero: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.missingIsNotZero,
  unauthorizedIsNotZero: SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS.unauthorizedIsNotZero,
  unassignedAccountsRemainVisible: true,
  drilldownDoesNotMutateSourceTruth: true,
  noGenericBiBuilder: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noGenericBiEngine,
  publicationDeferredToFin06: true,
  liquidityDeferredToFin09: true,
  balanceSheetDeferredToFin11: true,
  countryAgnostic: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.countryAgnostic,
  sportAgnostic: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.sportAgnostic,
  teamNotRequired: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.teamNotRequired,
  integerMinorUnits: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.moneyUsesIntegerMinorUnits,
  tenantScopedDrilldown: true,
  permissionAwareEvidence: true,
  noNPlusOneReportingDrilldown: true,
  lazyDetailEvidenceLoad: true,
} as const;

export const FINANCE_05E_IMPLEMENTATION = {
  managementReportingDetailReadModel: "FinanceManagementReportingDetailReadModel",
  detailQueryLoader: "loadFinanceManagementReportingDetailReadModel",
  workspaceRoute: "/dashboard/finance/reports",
  detailInteraction: "SCE_SHEET_CONTEXTUAL_DETAIL",
  fin05eStatus: "COMPLETE_PO_UAT_PASS",
  fin05fStatus: "COMPLETE_PO_UAT_PASS",
} as const;

/** FIN-05F implementation locks — Forecast / Budget / Actual comparative intelligence. */
export const SCE_FINANCE_REPORTING_05F_ARCHITECTURE_LOCKS = {
  comparativeIntelligenceReadModel: "FinanceComparativeIntelligenceReadModel",
  composesFin05bVarianceEngine: true,
  reusesFin05bVarianceEngine: true,
  reusesFin05cManagementPnlHierarchy: true,
  reusesFin05eInvestigationDrilldown: true,
  primaryComparisonIsForecastVsApprovedBudget: true,
  actualIsEvidenceWhenGrainDiffers: true,
  ytdActualVsAnnualBudgetIsContextNotVariance: true,
  ytdActualVsAnnualForecastIsContextNotVariance: true,
  comparisonAvailabilityExplicit: true,
  noFakeMonthlyPhasing: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing,
  noSecondVarianceEngineInReact: true,
  noGenericBiEngine: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noGenericBiEngine,
  automaticForecastDoesNotReplaceCurrentForecast: true,
  scenarioDoesNotReplaceCurrentForecast: true,
  expectedEventsAreNotBudgetPhasing: true,
  noLiquidityInFin05: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noLiquidityInFin05,
  publicationDeferredToFin06: true,
  balanceSheetDeferredToFin11: true,
  missingIsNotZero: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.missingIsNotZero,
  tenantScopedReporting: true,
  permissionAwareComposition: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.permissionAwareComposition,
  noFabricatedTrendFromSingleSnapshot: true,
  materialityUsesRelativeRankingNotUniversalThresholds: true,
} as const;

export const FINANCE_05F_IMPLEMENTATION = {
  comparativeIntelligenceReadModel: "FinanceComparativeIntelligenceReadModel",
  comparativeIntelligenceBuilder: "buildFinanceComparativeIntelligenceReadModel",
  comparisonAvailabilityModule: "lib/finance/reporting/comparative-comparison-availability.ts",
  workspaceRoute: "/dashboard/finance/reports",
  fin05fStatus: "COMPLETE_PO_UAT_PASS",
  fin05gStatus: "COMPLETE_PO_UAT_PASS",
} as const;

/** FIN-05G implementation locks — visual intelligence & responsive hardening. */
export const SCE_FINANCE_REPORTING_05G_ARCHITECTURE_LOCKS = {
  composesFin05fComparativeIntelligence: true,
  noNewFinancialSemantics: true,
  expectedEventTimelineIsNotLiquidityGraph: true,
  noFakeMonthlyPhasing: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing,
  responsiveProgressiveDisclosureRequired: true,
  favorabilityNotColorOnly: true,
} as const;

export const FINANCE_05G_IMPLEMENTATION = {
  workspaceRoutes: ["/dashboard/finance", "/dashboard/finance/reports"] as const,
  fin05gStatus: "COMPLETE_PO_UAT_PASS",
  fin05hStatus: "COMPLETE_PO_UAT_PASS",
} as const;

/** FIN-05H implementation locks — release hardening & FIN-05 closure gate. */
export const SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS = {
  crossWorkspaceReconciliationRequired: true,
  overviewAndReportingConsumeSharedMeasureLoader: true,
  reportingIsNotSourceOfTruth: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.reportingIsNotSourceOfTruth,
  overviewIsNotSourceOfTruth: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.reportingIsNotSourceOfTruth,
  actualGrainConsistencyRequired: true,
  varianceSemanticsFromFin05bOnly: true,
  tenantIsolationRequired: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.tenantIsolationRequired,
  permissionAwareComposition: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.permissionAwareComposition,
  missingIsNotZero: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.missingIsNotZero,
  unauthorizedIsNotZero: SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS.unauthorizedIsNotZero,
  noFakeMonthlyPhasing: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing,
  expectedMovementVisualizationPrincipleRefined: true,
  liquidityDeferredToFin09: true,
  publicationDeferredToFin06: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.publicationDeferredToFin06,
  balanceSheetDeferredToFin11: SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.balanceSheetDeferredToFin11,
  noGenericBiEngine: SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noGenericBiEngine,
  noNewForecastEngine: true,
  noNewScenarioEngine: true,
  fin05ProgrammeReleaseClosed: true,
  financeVisualBenchmarkDocumented: true,
} as const;

export const FINANCE_05H_IMPLEMENTATION = {
  releaseHardeningDoc: "docs/finance/SCE-FINANCE-05H-RELEASE-HARDENING-CLOSURE.md",
  releaseTestSuite: "lib/finance/__tests__/finance-05h-release-hardening-closure.test.ts",
  fin05hStatus: "COMPLETE_PO_UAT_PASS",
  fin05ProgrammeStatus: "COMPLETE_RELEASE_CLOSED",
  fin06Status: "NOT_STARTED",
} as const;

export const FINANCE_05C_IMPLEMENTATION = {
  managementPnlReadModel: "FinanceManagementPnlReadModel",
  queryLoader: "loadFinanceManagementPnlReadModel",
  workspaceRoute: "/dashboard/finance/reports",
  completenessModule: "lib/finance/reporting/pnl-reporting-completeness.ts",
  unassignedResidualGroupId: "__sce_management_pnl_unassigned__",
} as const;
