# SCE-FINANCE-05D — Finance Übersicht & Decision Intelligence

| Field | Value |
| --- | --- |
| **Status** | **IMPLEMENTED / AWAITING PO REVIEW** (not merged) |
| **Branch** | `cursor/sce-finance-05d-overview-decision-intelligence-4dba` |
| **Depends on** | FIN-05B read models, FIN-05C presentation helpers, FIN-04E timing & movement visual (R4) |

## Role

**Übersicht = UNDERSTAND** — interpretive summary and attention routing, not a second P&L, not liquidity, not a chart gallery.

### Ten-second comprehension contract

1. Where are we? (expected management result)
2. Are we on track? (forecast vs approved budget with semantic favourability)
3. What drives the difference? (restrained top drivers)
4. What deserves attention? (prioritized exceptions)
5. What financial movements are coming? (FIN-04E expected-movement visual when timed evidence exists)

Information hierarchy: **interpretation → exception → explanation → evidence** (conclusion → why → detail).

## Source authority

| Measure | Authority |
| --- | --- |
| Approved budget | Governance baseline (`FinanceBudget` approved version) |
| Actual | FIN-03B postings; YTD only with explicit cutoff (forecast version `actualsThroughDate`) |
| Current forecast | `FinanceForecast.currentVersionId` — never automatic forecast |
| Expected events / timing | FIN-04E temporal evidence |
| Übersicht | Consumer only — no source-of-truth writes |

## Read model

`FinanceOverviewDecisionIntelligenceReadModel` composes:

- `FinanceManagementOverviewReadModel` (FIN-05B)
- Deterministic financial conclusion
- Restrained drivers (max 3 per favourability side)
- Attention items (timing + variance + missing sources)
- Expected-movement section (FIN-04E visual reuse)

Loader: `loadFinanceOverviewDecisionIntelligenceReadModel`.

## Expected movement ≠ liquidity

Chart semantics: signed expected financial movement over real business time. Not cash balance, runway, or treasury (FIN-09).

Timing coverage is **Terminierungsgrad** only — not forecast confidence.

## Incomplete states

Missing measures render as unavailable (`—`), not zero. Unauthorized measures are `NOT_VISIBLE` without leakage through derived values.

## Permissions

Composition respects budget / actual / forecast view scopes. Timing block requires forecast visibility and forecasting capability.

## Next

- **FIN-05E** — Reporting workspace drill-down (not started)
- PO visual UAT on Übersicht narrative
