# SCE-FINANCE-05E — Reporting Workspace & Drill-down

## Status

| Package | Status |
|---------|--------|
| FIN-05A | COMPLETE |
| FIN-05B | COMPLETE |
| FIN-05C | COMPLETE / PO UAT PASS |
| FIN-05D | COMPLETE / PO UAT PASS |
| **FIN-05E** | **IMPLEMENTED / PO UAT PENDING** |
| FIN-05F | NEXT / NOT STARTED |
| FIN-05G | NOT STARTED |
| FIN-05H | NOT STARTED |

## Purpose

Finance → Berichte (`/dashboard/finance/reports`) is SCE's canonical **financial investigation workspace**. It preserves the FIN-05C Management P&L statement and adds progressive drill-down:

**Interpretation → Material variances → Management statement → Account / group evidence**

Reporting remains **analyse / explain / present** — not source-of-truth editing, not generic BI, not liquidity, not statutory accounting.

## Read models

- **Statement:** `FinanceManagementPnlReadModel` via `loadFinanceManagementPnlReadModel` (FIN-05C, unchanged semantics).
- **Detail (lazy):** `FinanceManagementReportingDetailReadModel` via `loadFinanceManagementReportingDetailReadModel` — composes FIN-05B/C measures and FIN-03B dated actual entries for one account or reporting group.

## Interaction

- Account / group rows expose an **Investigate** affordance.
- Detail opens in the canonical SCE **Sheet**; the statement remains visible behind the panel.
- Key variance drivers link to the same detail loader (FIN-05B driver identity).
- Optional deep links: `?account=` / `?group=` (validated server-side, tenant-scoped).

## Boundaries (locked)

- No inline budget / actual / forecast editing in Berichte — routes to canonical workspaces.
- No liquidity projection (FIN-09).
- No publication / sharing (FIN-06).
- No balance sheet / journal semantics (FIN-11).
- Expected timing: route to Zeitplanung only — not a second timing workspace.

## FIN-09 note

Expected-event timelines in FIN-05D/FIN-04E are **timing intelligence**, not authoritative running liquidity. FIN-09 later owns opening balance + dated inflows/outflows + running projected balance.
