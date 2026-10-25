/**
 * FIN-04E-07 — visual forecast timing intelligence (architecture locks).
 *
 * @see docs/finance/SCE-FINANCE-04E-07-VISUAL-TIMING-INTELLIGENCE.md
 */

export const FINANCE_FORECAST_TIMING_VISUAL_FIN_04E_07 = {
  primaryVisual: "TEMPORAL_MOVEMENT_TIMELINE",
  dataBuilder: "buildFinanceForecastTimingVisualModel",
  scenarioVisualBuilder: "buildScenarioAssumptionTemporalVisualModel",
} as const;

/** Machine-testable locks for FIN-04E-07 visual timing. */
export const FINANCE_FORECAST_TIMING_VISUAL_04E_07_ARCHITECTURE_LOCKS = {
  VISUALS_USE_EVIDENCE_BACKED_TIMING: true,
  NO_ANNUAL_DIVIDE_BY_12: true,
  NO_REMAINING_DIVIDE_BY_MONTHS: true,
  UNSCHEDULED_REMAINDER_REMAINS_VISIBLE: true,
  MONTH_PRECISION_NOT_EXACT_DATE: true,
  DATE_RANGE_NOT_EXACT_DATE: true,
  NO_RANGE_DAY_PRORATION: true,
  INCOME_EXPENSE_REMAIN_DISTINCT: true,
  OVERALLOCATION_NOT_NORMALIZED: true,
  AMBIGUITY_NOT_GUESSED: true,
  CROSS_FINANCE_YEAR_TIMING_SUPPORTED: true,
  SCENARIO_VISUAL_DOES_NOT_CREATE_EVENTS: true,
  PARTIAL_SCENARIO_IMPACT_NOT_FABRICATED: true,
  EXPECTED_TIMING_IS_NOT_LIQUIDITY: true,
  EXPECTED_DATE_IS_NOT_ACCOUNTING_RECOGNITION: true,
  TENANT_CURRENCY_NOT_HARDCODED: true,
  CHART_NOT_ONLY_INFORMATION_SOURCE: true,
  /** FIN-04E-07R3 — see finance-forecast-timing-direction-07r3-architecture-contract.ts */
  DIRECTIONAL_MOVEMENT_PRESENTATION_IN_07R3: true,
} as const;
