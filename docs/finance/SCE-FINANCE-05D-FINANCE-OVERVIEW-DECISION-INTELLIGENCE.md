# SCE-FINANCE-05D — Finance Übersicht & Decision Intelligence

| Field | Value |
| --- | --- |
| **Status** | **IMPLEMENTED / AWAITING PO REVIEW** (R1 visual refinement) |
| **Branch** | `cursor/sce-finance-05d-overview-decision-intelligence-4dba` |
| **Depends on** | FIN-05B read models, FIN-05C presentation helpers, FIN-04E timing semantics |

## PO UAT R1 findings (addressed)

- Raw favourability translation key on Übersicht — fixed (`actuals.favorability*`).
- Oversized FIN-04E movement chart on Übersicht — replaced with compact **expected financial event timeline**.
- Axis label collisions / viewport dominance — timeline height capped (~280px), responsive tick thinning, mobile list fallback.
- Duplicate Zeitplanung CTAs — single primary route (attention or untimed footer / zero-timing).
- Hard-coded **≥30%** untimed “materiality” rule — **removed** (presentation uses deterministic partial-timing state only; not domain truth).

## Canonical SCE visual grammar (FIN-05D lock)

| Question | Visual |
| --- | --- |
| Continuous balance / stock over time | **Line / area** (reserved — **FIN-09** liquidity) |
| Discrete expected movements over time | **Event timeline** (FIN-05D Übersicht) |
| Category magnitude | Bar |
| Variance / contribution | Diverging or ranked bars (Berichte) |

**Expected event timing ≠ liquidity.** Do not call the Übersicht timeline Cashflow or Liquidität.

Connecting discrete expected movements with a line would falsely imply a continuous quantity between events.

## FIN-09 future liquidity (design note only — not implemented)

- Opening cash balance + expected cash inflows − expected cash outflows = **projected running cash balance**.
- Preferred primary visual: **running cash balance line / subtle area** (time on X, balance on Y).
- Historical vs forecast boundary, optional thresholds — FIN-09 scope.

See `SCE_FINANCE_09_LIQUIDITY_VISUAL_DESIGN_NOTE` in `finance-reporting-intelligence-architecture-contract.ts`.

## Role

**Übersicht = UNDERSTAND** — executive briefing: conclusion → attention → key variances → upcoming expected movements → compact untimed context.

## Source authority

Unchanged — FIN-05B / FIN-03 / FIN-04E consumers only; timeline is **presentation**.

## Event timeline semantics (R1)

- **EXACT_DATE** — point marker; business date preserved.
- **MONTH** — bounded interval for that month (not fake exact day).
- **DATE_RANGE** — bounded interval for real range.
- **UNSCHEDULED** — never plotted on axis; shown in footer strip with income/expense breakdown when available.
- Amount encoding: textual primary; markers use restrained glyphs (not area ∝ amount).

## Responsive behaviour

- Desktop / tablet: horizontal timeline with direct labels.
- Mobile: chronological list (no squeezed axis).

## Next

- **FIN-05E** — Reporting workspace drill-down (not started)
- PO visual UAT on Übersicht R1
