# SCE-FINANCE-05D — Finance Übersicht & Decision Intelligence

| Field | Value |
| --- | --- |
| **Status** | **COMPLETE** — Product Owner visual UAT **PASS** (R2 approved; R3 not required) |
| **Branch** | `cursor/sce-finance-05d-overview-decision-intelligence-4dba` — PR **#911** → **STAGE** |
| **Depends on** | FIN-05B read models, FIN-05C presentation helpers, FIN-04E timing semantics |

## Product Owner closure

| Gate | Result |
| --- | --- |
| Visual UAT | **PASS** |
| R1 | **SUPERSEDED BY R2** |
| R2 | **APPROVED** |
| R3 | **NOT REQUIRED** |

**Approved product outcome:** Finance **Übersicht** is SCE's primary financial **decision surface**. Information hierarchy:

```text
CONCLUSION → EXCEPTION → EXPLANATION → EVIDENCE
```

**Workspace responsibilities (locked):**

| Workspace | Role |
| --- | --- |
| **Übersicht** | **UNDERSTAND** |
| **Reporting (Berichte)** | **ANALYSE / EXPLAIN / PRESENT** |
| **Zeitplanung** | **MANAGE EXPECTED TIMING EVIDENCE** |
| **Einrichtung** | **CONFIGURE** |

## PO UAT R1 findings (addressed in R2)

- Raw favourability translation key on Übersicht — fixed (`actuals.favorability*`).
- Oversized FIN-04E movement chart on Übersicht — replaced with compact **expected financial event timeline**.
- Axis label collisions / viewport dominance — R2: ~200px canvas, edge-aligned month axis, year bands, collision-aware lanes (max 2), mobile list fallback.
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

## Overview vs detail (design lock)

- **Übersicht** — essential monitoring / decision information only.
- **Detail** — Berichte, Zeitplanung, and other workspaces for drill-down.

## Approved experience (R2 — do not reopen in closure)

### Financial outlook

- Expected result is dominant.
- Current Forecast vs Approved Budget interpretation; signed variance; semantic favourability.
- Contextual Actual with localized Actual cutoff — no mental arithmetic.

### Attention

- Concrete timing incompleteness; actual untimed amount; one timing CTA routing to Zeitplanung.

### Key variances

- Restrained favorable/unfavorable driver lists (no driver card soup); route to Berichte for evidence.

### Expected financial movements

- Compact event timeline (~200px canvas); discrete events, not running balance.
- **EXACT_DATE** — point; **MONTH** / **DATE_RANGE** — bounded intervals (not fake exact days).
- Direct WHEN / AMOUNT / WHAT labels; precision preserved.
- Unscheduled events excluded from axis; untimed income/expense reconciliation below.
- Collision-aware presentation lanes (max two); deterministic layout; dense-event fallback.
- Quiet fiscal/year boundary; compact month/year axis; chronological accessible DOM order.
- Mobile chronological-list fallback.

## Event timeline semantics

- **EXACT_DATE** — point marker; business date preserved.
- **MONTH** — bounded interval for that month (not fake exact day).
- **DATE_RANGE** — bounded interval for real range.
- **UNSCHEDULED** — never plotted on axis; shown in footer strip with income/expense breakdown when available.
- Amount encoding: textual primary; markers use restrained glyphs (not area ∝ amount).

## R2 presentation (timeline)

- Restrained month axis; calendar/fiscal year context only where the year changes (configured finance year boundary when visible).
- Quiet fiscal-year vertical rule — no competing “Finanzjahresende” label in event lanes.
- Deterministic collision layout: max **two** event lanes; optional `+N weitere` density affordance.
- Bounded interval grammar for **MONTH** and **DATE_RANGE** (endpoint bars, not midpoint fake dates).
- Compact section header; semantic “not balance” via info affordance + SR text; untimed footer shows income/expense breakdown without repeating the attention-strip total.

## Responsive behaviour

- Desktop / tablet: horizontal timeline with direct labels.
- Mobile: chronological list (no squeezed axis).

## Future polish (FIN-05G — not FIN-05D)

Minor visual refinements identified during FIN-05D UAT belong to **FIN-05G**, not a reopen of FIN-05D:

- Smarter aesthetic timeline-window bounds.
- Broader Finance visual-language consolidation.
- Responsive hardening.
- Cross-workspace visual consistency.

## Next

- **FIN-05E** — Reporting workspace drill-down (**COMPLETE / PO APPROVED** — PR **#912** → **STAGE**)
- **FIN-05F** — Comparative intelligence (**NEXT** — **NOT STARTED**)
- **FIN-05F–05H** — not started
