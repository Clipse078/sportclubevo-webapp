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

### R1 — Quiet investigation UX / driver-to-evidence

**Status:** IMPLEMENTED (same package) — PO visual UAT still pending.

Canonical grammar:

| Surface | Interaction |
|---------|-------------|
| **Material variance drivers** (`Wesentliche Abweichungen`) | Primary investigation entry — driver row opens FIN-05E detail for the resolved FIN-05B target. |
| **Account rows** | Quiet direct investigation — account identity is the control (no repeated textual action column). |
| **Reporting groups** | Explicit hierarchy expand/collapse **separate** from a quiet group investigation affordance. |
| **Management statement** | Numbers first — Budget → Ist → Prognose → Abweichung; no permanent action column. |

Detail opens in the canonical SCE **Sheet** (interpretation → explanation → evidence → secondary source routes). Optional deep links: `?account=` / `?group=` (validated server-side, tenant-scoped).

## Boundaries (locked)

- No inline budget / actual / forecast editing in Berichte — routes to canonical workspaces.
- No liquidity projection (FIN-09).
- No publication / sharing (FIN-06).
- No balance sheet / journal semantics (FIN-11).
- Expected timing: route to Zeitplanung only — not a second timing workspace.

## FIN-09 note

Expected-event timelines in FIN-05D/FIN-04E are **timing intelligence**, not authoritative running liquidity. FIN-09 later owns opening balance + dated inflows/outflows + running projected balance.
