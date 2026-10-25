/**
 * SCE Finance FIN-04E — Forecast timing & expected financial events architecture contract.
 *
 * Pure types/constants — no Prisma, persistence, services, UI, charts, liquidity,
 * or scenario effective-date implementation in FIN-04E-01.
 *
 * Locked principle:
 *   ANNUAL EXPECTATION ≠ EXPECTED FINANCIAL TIMING ≠ EFFECTIVE-DATE ASSUMPTION
 *
 * @see docs/finance/SCE-FINANCE-04E-FORECAST-TIMING-ARCHITECTURE.md
 */

import { FINANCIAL_YEAR_CONFIGURABLE } from "@/lib/finance/finance-architecture";
import { FINANCE_AMOUNT_STORAGE } from "@/lib/finance/money-types";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";
import { FORECAST_REFORECAST_COMPOSITION } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import {
  FINANCE_FORECAST_TIMING_LOCKED_PRINCIPLE,
  FINANCE_NAIVE_MONTH_PRORATION_FORBIDDEN,
} from "@/lib/finance/forecast/scenario-architecture-contract";
import {
  SCE_MEASURE_ACTUAL,
  SCE_MEASURE_CURRENT_FORECAST,
} from "@/lib/finance/projection/projection-architecture-contract";

/** FIN-04E product principle (locked in architecture). */
export const EXPECTED_FINANCIAL_EVENT_PRODUCT_PRINCIPLE =
  "EXPECTED FINANCIAL TIMING DECOMPOSES ANNUAL EXPECTATION — IT DOES NOT REPLACE CURRENT FORECAST AUTHORITY, ACTUAL TRUTH, OR ACCOUNTING RECOGNITION." as const;

/**
 * Canonical internal persistence name (FIN-04E-01 decision).
 *
 * Replaces the FIN-04D placeholder `FinanceExpectedCashEvent`: FIN-04E models
 * **expectation**, not settled bank/cash movement.
 */
export const EXPECTED_FINANCIAL_EVENT_CANONICAL_MODEL_NAME =
  "FinanceExpectedFinancialEvent" as const;

/** Prior placeholder retained only in historical FIN-04D docs — not canonical. */
export const EXPECTED_FINANCIAL_EVENT_SUPERSEDED_PLACEHOLDER_NAME =
  "FinanceExpectedCashEvent" as const;

/** Tenant-facing German — direction only; copy not locked until UX packages. */
export const EXPECTED_FINANCIAL_EVENT_GERMAN_PRODUCT_TERMS_CANDIDATES = {
  generic: "Erwarteter finanzieller Vorgang",
  inflow: "Erwarteter Eingang",
  outflow: "Erwartete Zahlung",
  timingSection: "Erwartete Termine",
  unscheduledRemainder: "Noch nicht terminiert",
} as const;

/** Aligns with FIN-04D locked separation (wording evolved: financial timing, not cash-only). */
export const FINANCE_TEMPORAL_LOCKED_PRINCIPLE =
  "ANNUAL_EXPECTATION ≠ EXPECTED_FINANCIAL_TIMING ≠ EFFECTIVE_DATE_ASSUMPTION" as const;

/** Cross-reference: FIN-04D contract uses equivalent `FINANCE_FORECAST_TIMING_LOCKED_PRINCIPLE`. */
export const FINANCE_TEMPORAL_LOCKED_PRINCIPLE_ALIASES = {
  fin04dContract: FINANCE_FORECAST_TIMING_LOCKED_PRINCIPLE,
  fin04eContract: FINANCE_TEMPORAL_LOCKED_PRINCIPLE,
  semanticallyEquivalent: true,
} as const;

/** Machine-testable architecture locks (FIN-04E-01). */
export const EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS = {
  expectedEventIsNotActual: true,
  expectedEventIsNotForecastVersion: true,
  expectedDateIsNotRecognitionDate: true,
  expectedDateIsNotActualSettlementDate: true,
  annualExpectationSeparateFromTiming: true,
  unscheduledRemainderAllowed: true,
  noNaiveMonthProration: FINANCE_NAIVE_MONTH_PRORATION_FORBIDDEN
    .forbiddenWithoutExplicitEvenDistributionEvidence,
  noFakeMonthlyPhasing: FORECAST_PHASING_SUPPORTED === false,
  dateOnlyBusinessTiming: true,
  countryAgnostic: true,
  sportAgnostic: true,
  organisationAgnostic: true,
  tenantScoped: true,
  financeYearScopedWhereApplicable: true,
  integerMinorUnits: true,
  liquidityDeferredToFin09: true,
  effectiveDatedScenariosDeferredUntilTemporalFoundation: true,
  fin04dScenarioAssumptionSchemaUnchangedIn04e01: true,
  persistenceNotImplementedIn04e01: true,
  persistenceImplementedIn04e02: true,
  timingReadModelImplementedIn04e04: true,
  directionDerivedFromFinancialAccount: true,
  independentEditableEventDirectionForbidden: true,
  treasuryTransferModelingDeferred: true,
} as const;

/**
 * Domain definition — what an expected financial event represents.
 *
 * Evidence/decomposition of **when** (and how much at that timing) part of future
 * expectation is expected to occur — not authoritative annual forecast by itself.
 */
export const EXPECTED_FINANCIAL_EVENT_DOMAIN_DEFINITION = {
  canonicalModelName: EXPECTED_FINANCIAL_EVENT_CANONICAL_MODEL_NAME,
  summary:
    "A dated expectation that an amount of a FinancialAccount's future financial expectation is expected to occur at or around a particular business date.",
  authoritativeAnnualForecastAmount: false,
  temporalEvidenceRole: "TIMING_PROFILE_AND_DECOMPOSITION",
  notActual: true,
  notInvoice: true,
  notBankTransaction: true,
  notCommitmentDuplicate: true,
  notReceivableDuplicate: true,
  tenantId: "required",
  financeYearId: "required where annual forecast context applies",
  financialAccountId: "required — direction derived from account canonicalSemantic",
  expectedAmountMinor: "integer minor units — magnitude follows FIN-03/04 account conventions",
  timing: "expectedTiming (precision + date or range or month or unscheduled)",
  optionalConfidence: true,
  optionalSourceReference: true,
  auditMetadataTimestamped: true,
} as const;

/** Capability — reuse FORECASTING (FIN-04A–04D pattern). */
export const EXPECTED_FINANCIAL_EVENT_CAPABILITY_KEY = "FORECASTING" as const;

/** Permissions for manual expected event services (FIN-04E-03). */
export const EXPECTED_FINANCIAL_EVENT_PERMISSIONS = {
  view: "finance.forecast.view",
  manage: "finance.forecast.manage",
} as const;

/** Machine-testable locks introduced with FIN-04E-04 read models. */
export const EXPECTED_FINANCIAL_EVENT_04E_04_ARCHITECTURE_LOCKS = {
  TIMING_READ_MODEL_IS_PRESENTATION_NEUTRAL: true,
  ACCOUNTS_WITHOUT_EVENTS_REMAIN_VISIBLE: true,
  EMPTY_EVENTS_MEANS_UNSCHEDULED_NOT_NO_DATA: true,
  INCOME_AND_EXPENSE_REMAIN_DISTINCT: true,
  AMBIGUOUS_TIMING_REMAINS_DISTINCT: true,
  OVERALLOCATION_IS_EXPLICIT: true,
  MISSING_FORECAST_LINE_IS_EXPLICIT: true,
  NO_DOUBLE_COUNTING_OF_EXPECTED_EVENTS: true,
  UPCOMING_SORT_DOES_NOT_CHANGE_TIMING_PRECISION: true,
  NO_HARDCODED_MATERIALITY_THRESHOLD: true,
  READ_MODEL_USES_CURRENT_FORECAST_POINTER: true,
  READ_MODEL_USES_EXPLICIT_FINANCIAL_REFERENCE_DATE: true,
  READ_MODEL_DOES_NOT_IMPLEMENT_LIQUIDITY: true,
} as const;

/** Machine-testable locks introduced with FIN-04E-03 application services. */
export const EXPECTED_FINANCIAL_EVENT_04E_03_ARCHITECTURE_LOCKS = {
  MANUAL_EVENT_CRUD_DOES_NOT_MUTATE_FORECAST: true,
  DELETE_EVENT_RETURNS_AMOUNT_TO_DERIVED_UNSCHEDULED_REMAINDER: true,
  OVERALLOCATED_IS_ALLOWED_AND_SURFACED: true,
  SOURCE_OWNED_EVENT_NOT_GENERICALLY_MANUAL_MUTABLE: true,
  VIEW_REQUIRES_FORECAST_VIEW: true,
  MUTATION_REQUIRES_FORECAST_MANAGE: true,
  CURRENT_FORECAST_RESOLVED_BY_POINTER: true,
  ACTUAL_CUTOFF_EXPLICIT: true,
  NO_SYSTEM_CLOCK: true,
  NO_PRESENTATION_FORMATTING_IN_DOMAIN_SERVICE: true,
  ARCHIVED_ACCOUNT_NEW_EVENT_REJECTED: true,
  MANUAL_CREATE_ZERO_AMOUNT_REJECTED: true,
} as const;

/** Machine-testable locks introduced with FIN-04E-02 persistence & reconciliation. */
export const EXPECTED_FINANCIAL_EVENT_04E_02_ARCHITECTURE_LOCKS = {
  UNSCHEDULED_REMAINDER_IS_DERIVED: true,
  EXPECTED_EVENTS_DO_NOT_REPLACE_ANNUAL_FORECAST: true,
  NO_SYNTHETIC_BALANCING_EVENT: true,
  OVERALLOCATION_DOES_NOT_MUTATE_FORECAST: true,
  TIMING_ONLY_DOES_NOT_CREATE_FORECAST_REVISION: true,
  EXPECTED_EVENT_DIRECTION_DERIVED_FROM_ACCOUNT: true,
  EXPECTED_EVENT_DATE_MAY_CROSS_FINANCE_YEAR: true,
  RECONCILIATION_CUTOFF_IS_EXPLICIT: true,
  NO_SYSTEM_CLOCK_FINANCIAL_CUTOFF: true,
  NO_FLOATING_POINT: true,
  NO_NAIVE_MONTH_PRORATION: FINANCE_NAIVE_MONTH_PRORATION_FORBIDDEN
    .forbiddenWithoutExplicitEvenDistributionEvidence,
  UNSCHEDULED_TIMING_PRECISION_NOT_PERSISTED: true,
} as const;

/** Amount sign rule — align with FIN-03A positive magnitude per account semantic. */
export const EXPECTED_FINANCIAL_EVENT_AMOUNT_SEMANTICS = {
  storage: FINANCE_AMOUNT_STORAGE.representation,
  magnitudePositiveOnAccount: true,
  directionFromAccountCanonicalSemantic: true,
  independentEventDirectionFieldForbidden: true,
  expenseAccountNegativeAmountForbidden: "avoid double inversion — use account semantic + positive magnitude",
  incomeAccountNegativeAmountForbidden: "avoid double inversion — use account semantic + positive magnitude",
  followsFinancialAccountAndForecastLineConventions: true,
} as const;

/** Timing precision — v1 minimal set; do not coerce approximate timing to exact dates. */
export const EXPECTED_FINANCIAL_EVENT_TIMING_PRECISION = [
  "EXACT_DATE",
  "DATE_RANGE",
  "MONTH",
  "UNSCHEDULED",
] as const;

export type ExpectedFinancialEventTimingPrecision =
  (typeof EXPECTED_FINANCIAL_EVENT_TIMING_PRECISION)[number];

export const EXPECTED_FINANCIAL_EVENT_TIMING_PRECISION_SEMANTICS = {
  EXACT_DATE: "Single business calendar date (e.g. sponsor installment due 15.09.2026).",
  DATE_RANGE: "Inclusive business date window when exact day unknown (e.g. tournament window).",
  MONTH: "Calendar month precision when only month is known (e.g. grant expected June 2026).",
  UNSCHEDULED:
    "Timing intentionally unknown — contributes to timed profile only when explicitly modeled elsewhere; remainder bucket uses reconciliation.",
} as const;

/** Business dates — not timezone-shifted timestamps for expectation dates. */
export const EXPECTED_FINANCIAL_EVENT_DATE_SEMANTICS = {
  primary: "BUSINESS_DATE_ONLY" as const,
  timeOfDayOnExpectationForbiddenByDefault: true,
  auditCreatedAtUsesTimestamp: true,
  timezoneMustNotShiftBusinessDate: true,
  isoDateStringStoragePreferred: true,
} as const;

/** Expected vs actual settlement — actual remains authoritative when present. */
export const EXPECTED_FINANCIAL_EVENT_ACTUAL_BOUNDARY = {
  expectedDateDistinctFromActualSettlementDate: true,
  actualAuthoritativeWhenLinked: true,
  fin03DatedActualEntries: true,
  fin04cAsOfDateAndActualsThroughDate: true,
  compositionAlignsWithRollingForecast:
    FORECAST_REFORECAST_COMPOSITION.fullYearExpectationAtCutoff,
  realizedAmountDerivedFromActualPreferred: true,
  persistRealizedStatusOnlyWhenNecessary: "prefer derivation via Actual/source linkage — FIN-04E-02+ decision",
  noRetroactiveScenarioEffectOnActual: true,
} as const;

/** FIN-11 boundary — operational timing ≠ accounting recognition. */
export const EXPECTED_FINANCIAL_EVENT_RECOGNITION_BOUNDARY = {
  expectedPaymentOrReceiptDate: "OPERATIONAL_FINANCIAL_TIMING",
  accountingRecognitionPeriod: "DEFERRED_FIN_11",
  singleDateMustNotMeanBoth: true,
  fin04eNotAccrualEngine: true,
} as const;

/**
 * Relationship to Current Forecast (FIN-04A) — annual authority unchanged.
 *
 * Current Forecast line `amountMinor` remains organisation-owned **full-year expectation**
 * at the forecast revision's Datenstand (see FIN-04C composition metadata).
 * Expected events provide temporal evidence — not a silent replacement ledger.
 */
export const EXPECTED_FINANCIAL_EVENT_CURRENT_FORECAST_RELATIONSHIP = {
  annualForecastAuthority: SCE_MEASURE_CURRENT_FORECAST,
  expectedEventsAreTimingEvidence: true,
  silentRedefineForecastAsSumOfEventsForbidden: true,
  explicitFutureWorkflowMayReconcile: true,
  timingOnlyEditDoesNotRequireForecastRevision: true,
  amountChangeOnEventAloneDoesNotSilentlyChangeAnnualForecast: true,
  annualAmountChangeBelongsToForecastGovernance: true,
} as const;

/**
 * Reconciliation semantics (conceptual — calculation in FIN-04E-02+).
 *
 * Per account at a cutoff, SCE should eventually explain:
 *   annual forecast X, actual through cutoff A, future timed T, future unscheduled U.
 */
export const EXPECTED_FINANCIAL_EVENT_RECONCILIATION = {
  states: ["BALANCED", "UNSCHEDULED_REMAINDER", "OVERALLOCATED"] as const,
  unscheduledRemainderDefinition:
    "Remaining future expectation not yet represented by valid timed expected events (subject to Actual/cutoff semantics).",
  overallocatedDefinition:
    "Sum of future timed expected events exceeds remaining future expectation — must surface conflict, never silently accept.",
  fakeEvenMonthlyDistributionForbidden: true,
  naiveDivideByTwelveForbidden: FINANCE_NAIVE_MONTH_PRORATION_FORBIDDEN.naiveFormulaPattern,
  exampleValid: { annualForecast: 100_000, timed: 70_000, unscheduled: 30_000 },
  exampleInvalid: "Spread 30_000 as 5_000/month for six months without distribution evidence",
  doNotDoubleCountActual: true,
  conceptualIdentity:
    "ACTUAL_THROUGH_CUTOFF + REMAINING_FUTURE_EXPECTATION = FULL_YEAR_EXPECTATION (FIN-04C); timed + unscheduled partition remaining future expectation only.",
} as const;

/** Minimal future lifecycle direction — not implemented in 04E-01. */
export const EXPECTED_FINANCIAL_EVENT_STATUS_DIRECTION = {
  v1Candidates: ["EXPECTED", "CANCELLED", "SUPERSEDED"] as const,
  realizedPreferDerived: true,
  persistRealizedDirectly: "discouraged unless audit requires — prefer Actual linkage",
  partiallyRealizedFuture: true,
} as const;

/** Confidence — avoid false sophistication in v1. */
export const EXPECTED_FINANCIAL_EVENT_CONFIDENCE_DIRECTION = {
  v1LightweightExpectationConfidence: true,
  separateTimingAndAmountConfidenceDeferred: true,
  timingConfidenceDistinctFromAmountConfidenceConceptually: true,
  complexityInSystemNotUserHead: true,
} as const;

/** Recurring expectations — architecture only. */
export const EXPECTED_FINANCIAL_EVENT_RECURRENCE_DIRECTION = {
  manualTwelveMonthlyEventsForbiddenAsOnlyModel: true,
  preferredFutureApproach: "RECURRENCE_RULE_OR_SCHEDULE_TEMPLATE → MATERIALIZED_EXPECTED_EVENTS",
  opaqueRecurrenceOnlyForbidden: "audit/reconciliation must remain possible",
  notImplementedIn04e01: true,
} as const;

/**
 * Extensible source model — manual first; domain sources integrate without duplicating state.
 */
export const EXPECTED_FINANCIAL_EVENT_SOURCE_KINDS = {
  v1Required: ["MANUAL"] as const,
  futureOperational: [
    "COMMITMENT_FIN_07",
    "INVOICE_RECEIVABLE_FIN_08",
    "SPONSOR_AGREEMENT",
    "GRANT",
    "MEMBER_FEE",
    "REGISTRATION",
    "TRAINER_COMPENSATION",
    "FACILITY_OBLIGATION",
    "TRAVEL_COMMITMENT",
    "TOURNAMENT_EVENT",
    "RECURRING_PAYMENT",
    "OTHER",
  ] as const,
  sourceAgnosticCore: true,
  crossTenantSourceReferenceForbidden: true,
  fin07ProducesOutgoingTimingEvidence: true,
  fin08ProducesIncomingTimingEvidence: true,
  fin04eConsumesNormalizesTiming: true,
  doesNotDuplicateCommitmentOrReceivableState: true,
} as const;

/** FIN-04B boundary — projection stable; optional future seam only. */
export const EXPECTED_FINANCIAL_EVENT_PROJECTION_BOUNDARY = {
  fin04bDoesNotDependOnFin04e: true,
  temporalEvidenceMayImproveFutureAutomaticForecast: true,
  knownInstallmentDatesMayInformProjectionTimingFuture: true,
} as const;

/** FIN-04D boundary — annual scenarios unchanged in 04E-01. */
export const EXPECTED_FINANCIAL_EVENT_SCENARIO_BOUNDARY = {
  fin04dAnnualSemanticsUnchanged: true,
  effectiveDateOnFinanceScenarioAssumptionForbiddenUntil04e06: true,
  futureAbDatumRequiresTemporalEvidence: true,
  scenarioOperatesOnFutureExpectationNotPastActual: true,
  fin04e06PlannedForEffectiveDatedScenarioIntegration: true,
} as const;

/** FIN-09 liquidity — separate product. */
export const EXPECTED_FINANCIAL_EVENT_LIQUIDITY_BOUNDARY = {
  fin04eAnswers: "WHEN_DO_WE_EXPECT_FINANCIAL_MOVEMENT",
  fin09Answers: "GIVEN_INFLOWS_OUTFLOWS_AND_CASH_POSITION_WHAT_IS_LIQUIDITY",
  liquidityNotImplementedIn04e: true,
  treasuryTransferSemanticsDeferred: true,
} as const;

/** Finance year boundary — expectation vs cash timing may diverge across year edge. */
export const EXPECTED_FINANCIAL_EVENT_FINANCE_YEAR_BOUNDARY = {
  financeYearTenantConfigurable: FINANCIAL_YEAR_CONFIGURABLE,
  expectationBelongingToFinanceYearDistinctFromCashDateOutsideYear: true,
  autoRejectEventOutsideFinanceYearForbidden: true,
  january2028PaymentForFy2027ExpectationAllowedConceptually: true,
  importantForFin09LiquidityLater: true,
} as const;

/** Multi-tenant isolation locks. */
export const EXPECTED_FINANCIAL_EVENT_TENANT_ISOLATION = {
  allPersistenceTenantScoped: true,
  financeYearOwnershipValidated: true,
  financialAccountOwnershipValidated: true,
  sourceReferencesCannotCrossTenants: true,
  temporalEvidenceCannotLeakAcrossTenants: true,
} as const;

/** UX architecture direction — not implemented in 04E-01. */
export const EXPECTED_FINANCIAL_EVENT_UX_ARCHITECTURE = {
  sceUxPrinciple: "SIMPLE UNDERSTANDING. SHALLOW NAVIGATION. DEEP CAPABILITY.",
  informationHierarchy: ["CONCLUSION", "EXCEPTION", "EXPLANATION", "EVIDENCE"] as const,
  defaultQuestions: [
    "How much remains expected?",
    "How much is already timed?",
    "What is still unscheduled?",
    "What important payment or receipt is next?",
  ] as const,
  giantSchedulingTableNotDefault: true,
  manualEntryMinimalFields: ["FinancialAccount", "expectedAmountMinor", "expectedTiming", "optionalDescription"] as const,
  progressiveDisclosureAdvanced: ["timingPrecision", "confidence", "sourceContext"] as const,
  noNewBinaryCheckboxPatterns: true,
} as const;

/** FIN-06 publication — timing may be more sensitive than annual forecast. */
export const EXPECTED_FINANCIAL_EVENT_PUBLICATION_BOUNDARY = {
  fin06Separate: true,
  detailedPaymentScheduleNotAutoPublishedWithAnnualForecast: true,
  futurePermissionConsiderationRequired: true,
  notImplementedIn04e01: true,
} as const;

/** Visual intelligence contract — charts consume real evidence later (FIN-04E-07). */
export const EXPECTED_FINANCIAL_EVENT_VISUAL_INTELLIGENCE = {
  notImplementedIn04e01: true,
  noFakeMonthlyDistribution: true,
  chartsConsumeRealTemporalEvidence: true,
  futureViews: [
    "expected_inflows_over_time",
    "expected_outflows_over_time",
    "net_expected_movement",
    "timed_vs_unscheduled",
    "actual_vs_expected",
    "confidence_uncertainty",
    "scenario_adjusted_timing",
  ] as const,
} as const;

/** Persistence — FIN-04E-02 foundation (services/UI in later packages). */
export const EXPECTED_FINANCIAL_EVENT_PERSISTENCE_PROPOSAL = {
  migrationInFin04e01: false,
  migrationInFin04e02: "20261024200000_sce_finance_04e_02_expected_event_persistence",
  primaryModel: EXPECTED_FINANCIAL_EVENT_CANONICAL_MODEL_NAME,
  notInPrismaSchemaYet: false,
  unscheduledRemainderPersisted: false,
  syntheticBalancingEventPersisted: false,
  permissionsReuseLikely: ["finance.forecast.view", "finance.forecast.manage"] as const,
} as const;

/** FIN-04E programme package sequence (FIN-04E-01 recommendation). */
export const EXPECTED_FINANCIAL_EVENT_PACKAGE_PLAN = {
  "04E_01": "Architecture & domain contract (this package)",
  "04E_02": "Persistence & reconciliation foundation",
  "04E_03": "Expected event services & manual management",
  "04E_04": "Forecast timing read model & intelligence",
  "04E_05": "Workspace UX",
  "04E_06": "Effective-dated scenario integration",
  "04E_07": "Visual timing intelligence",
  "04E_08": "Hardening & release closure",
} as const;

/** FIN-04E-08 hardening & release closure — programme merged to STAGE (FIN-05A doc refresh). */
export const EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE = {
  fin04eProgrammeComplete: true,
  /** Product Owner performed desktop visual UAT for FIN-04E-07 (including R5); not automated agent UAT. */
  productOwnerVisualUatPassRecorded: true,
  mergeAuthorizationPending: false,
  mergedToStage: true,
  stageMergeCommitSha: "c1450ef7ce5849705c4f9e4ace248e1996d45a4a",
  prTargetBranch: "STAGE",
  prNumber: 907,
  noOverviewMovementChartInFin04e: true,
  noLiquidityInFin04e: true,
  noProfitAndLossInFin04e: true,
  zeitplanungMovementChartMounted: false,
  reusableMovementChartCapabilityPreserved: true,
  stageMigrationVerifyScripts: [
    "scripts/sce-finance-04e-02-stage-migration-verify.ts",
    "scripts/sce-finance-04e-06-stage-migration-verify.ts",
  ] as const,
  designSystemExplicitRerunRequired: true,
  permissionsExplicitRerunRequired: true,
  tenantIsolationExplicitRerunRequired: true,
  preserveStageUatExpectedEventFixtures: true,
  nextProgrammeSlice: "FIN-05",
} as const;

/** Integration map anchors. */
export const EXPECTED_FINANCIAL_EVENT_INTEGRATION_MAP = {
  currentForecast: "FIN-04A — annual authority",
  automaticForecast: "FIN-04B — independent; future timing seam",
  rollingForecast: "FIN-04C — asOfDate / actualsThroughDate cutoff semantics",
  scenarios: "FIN-04D — annual v1 unchanged until 04E-06",
  actuals: "FIN-03B — authoritative realized amounts",
  liquidity: "FIN-09 — consumes timing; out of FIN-04E scope",
  accounting: "FIN-11 — recognition separate from expected timing",
  commitments: "FIN-07 — source seam for outgoing timing",
  receivables: "FIN-08 — source seam for incoming timing",
  reporting: "FIN-05 — next after FIN-04E programme unless reprioritized",
} as const;

/** Measure guard — expected events are not a new SCE measure replacing ACTUAL or CURRENT_FORECAST. */
export const EXPECTED_FINANCIAL_EVENT_MEASURE_BOUNDARY = {
  notSceMeasureActual: SCE_MEASURE_ACTUAL,
  notSceMeasureCurrentForecast: SCE_MEASURE_CURRENT_FORECAST,
  isTemporalEvidenceLayer: true,
} as const;
