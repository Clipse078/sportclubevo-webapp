# SCE-FINANCE-05F — Forecast / Budget / Actual Comparative Intelligence

| Field | Value |
| --- | --- |
| **Programme** | FIN-05 — Financial Reporting & Intelligence |
| **Package** | **FIN-05F** — comparative intelligence (Budget / Actual / Current Forecast) |
| **Status** | **IMPLEMENTED — R1 decision-oriented attention — Product Owner visual UAT pending** |
| **Branch** | `cursor/sce-finance-05f-comparative-intelligence` |
| **Route** | `/dashboard/finance/reports` (Berichte) |
| **Depends on** | FIN-05B variance engine, FIN-05C Management P&L, FIN-05E investigation |

## Purpose

FIN-05F answers: **How is our financial position developing against the plan?** without turning Finance into a generic BI dashboard.

Users should see within ~10 seconds:

- **Plan** — approved budget (governance baseline)
- **Expected outcome** — current forecast (organisation expectation)
- **Primary variance** — current forecast vs approved budget (FIN-05B semantics)
- **Actual** — recorded progress with explicit period context (evidence, not a fake full-year variance)

## Source authority (unchanged)

| Measure | Role in FIN-05F |
| --- | --- |
| Approved budget | Governance baseline for supported comparisons |
| Actual | What has happened — grain and cutoff from canonical read models |
| Current forecast | Organisation-owned expectation for year-end |
| Automatic forecast | **Not** substituted for current forecast |
| Scenario | **Not** substituted for current forecast |
| Expected financial events | Timing evidence only — **not** budget/forecast phasing |

Reporting remains a **consumer** — FIN-05F does not mutate sources.

## Comparison availability matrix

Presentation roles (see `comparative-comparison-availability.ts`):

| Comparison | Typical role |
| --- | --- |
| Current forecast vs approved budget | **SUPPORTED** (annual vs annual) |
| Annual actual vs approved budget | **SUPPORTED** when actual grain is full year |
| YTD actual vs annual budget | **CONTEXT_ONLY** for actual display; variance **UNSUPPORTED** |
| YTD actual vs annual current forecast | **CONTEXT_ONLY** |
| Actual vs current forecast | **UNSUPPORTED** (misleading mixed semantics) |

`PERIOD_MISMATCH` from FIN-05B remains the variance slice guard — React does not recompute variance.

## No fake phasing

- `NO_FAKE_MONTHLY_PHASING = true`
- No `/12` budget or forecast fabrication
- `YTD_BUDGET_VARIANCE_SUPPORTED = false` (FIN-03B)

## Read model

`FinanceComparativeIntelligenceReadModel` is composed on the server when building `FinanceManagementPnlReadModel`:

- `overallComparison` — forecast vs budget at management result
- `actualContext` — grain, cutoff, evidence presentation role
- `comparisonAvailability` — full matrix for tests and future surfaces
- `materialDrivers` — reuse FIN-05B ranked drivers (investigation + ranking authority)
- `attentionInsights` — bounded decision-oriented insights (max 3): overall forecast-vs-budget conclusion, largest material favourable driver, largest material unfavourable driver

Integer minor units throughout; formatting in presentation only.

## UX (Berichte)

Progressive disclosure on the existing Management P&L:

1. **Conclusion** — interpretation strip (budget, forecast, variance, actual with authoritative period label)
2. **Where to look** — decision-oriented attention (max three concrete insights; driver rows open FIN-05E investigation)
3. **Comparison** — Management P&L statement columns (unchanged hierarchy)
4. **Explanation / evidence** — FIN-05E investigation sheet

No generic meta signals (“see exceptions below”, “progress evidence”). No duplicate “material variances” driver block in the default Reporting flow when the same drivers appear in attention.

No new top-level Finance tab. No chart gallery in FIN-05F (FIN-05G).

## FIN-05E integration

Investigation sheet receives `comparativePeriodContext` from the same comparative read model. Drill targets remain `FinanceManagementReportingDetailReadModel`.

## Boundaries

| Area | Owner |
| --- | --- |
| Liquidity / cash runway | FIN-09 |
| Statutory accounting / balance sheet | FIN-11 |
| Publish / share / snapshots | FIN-06 |
| Visual hardening / responsive charts | FIN-05G (next) |

## Security

- Tenant-scoped loads unchanged
- Measure visibility: missing ≠ zero; restricted measures do not leak through derived comparisons

## Validation

Focused tests: `lib/finance/__tests__/finance-05f-comparative-intelligence.test.ts`  
R1 regression: `lib/finance/__tests__/finance-05f-r1-decision-oriented-attention.test.ts`  
Architecture locks: `lib/finance/__tests__/finance-05f-reporting-architecture.test.ts`

## R1 (decision-oriented attention)

- Attention copy is financial insight, not a description of Reporting sections.
- Overall conclusion derives from forecast-vs-budget favourability (FIN-05B semantics).
- Driver rows reuse FIN-05B material ranking (top favourable / top unfavourable only).
- Actual summary label uses canonical grain (`Ist bis {cutoff}` for YTD; `Ist` for full year).
- Investigation sheet actual grain presentation verified against authoritative `actualGrain` / cutoff.
- No fake YTD-vs-annual variance, no `/12` phasing, no new chart.
