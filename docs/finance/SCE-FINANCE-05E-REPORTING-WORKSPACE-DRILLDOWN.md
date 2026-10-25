# SCE-FINANCE-05E — Reporting Workspace & Drill-down

## Status

| Package | Status |
|---------|--------|
| FIN-05A | COMPLETE |
| FIN-05B | COMPLETE |
| FIN-05C | COMPLETE / PO APPROVED |
| FIN-05D | COMPLETE / PO APPROVED |
| **FIN-05E** | **COMPLETE / PRODUCT OWNER VISUAL UAT PASS** (R1 **COMPLETE**, R2 **COMPLETE**, R3 **NOT REQUIRED**) |
| FIN-05F | **COMPLETE / PO APPROVED** (PR **#913** → **STAGE**) |
| FIN-05G | **COMPLETE / PO APPROVED** (PR **#914** → **STAGE**) |
| FIN-05H | NOT STARTED |

| Field | Value |
| --- | --- |
| **Branch** | `cursor/sce-finance-05e-reporting-workspace-drilldown-5fa5` |
| **PR** | **#912** → **STAGE** (closure merge authorized by Product Owner) |
| **Feature HEAD** | `8ed689aa8e3c39d2f6c95a2a829b0e473e2393f2` (includes R1 + R2) |

## Product Owner closure

| Gate | Result |
| --- | --- |
| Visual UAT | **PASS** |
| R1 | **ACCEPTED** |
| R2 | **ACCEPTED** |
| R3 | **NOT REQUIRED** |

**Reporting answers:** *Why is that happening?*

**Workspace roles (locked):**

| Workspace | Role |
| --- | --- |
| **Übersicht** | **UNDERSTAND** |
| **Berichte (Reporting)** | **ANALYSE / EXPLAIN / PRESENT** |
| **Zeitplanung** | **MANAGE EXPECTED TIMING EVIDENCE** |
| **Einrichtung** | **CONFIGURE** |

FIN-05E adds investigation and evidence to Reporting without turning SCE into generic BI software.

**Product principle:**

```text
SIMPLE UNDERSTANDING.
SHALLOW NAVIGATION.
DEEP CAPABILITY.
```

SCE handles the complexity so the user can make the decision.

### Information hierarchy (approved)

```text
INTERPRETATION → EXCEPTION / MATERIAL VARIANCE → FINANCIAL STATEMENT → INVESTIGATION → EXPLANATION → EVIDENCE → SOURCE ESCAPE HATCH
```

Equivalent compression:

```text
CONCLUSION → WHY → DETAIL → EVIDENCE
```

## Purpose

Finance → Berichte (`/dashboard/finance/reports`) is SCE's canonical **financial investigation workspace**. It preserves the FIN-05C Management P&L statement and adds progressive drill-down:

**Interpretation → Material variances → Management statement → Account / group evidence**

Reporting remains **analyse / explain / present** — not source-of-truth editing, not generic BI, not liquidity, not statutory accounting.

`REPORTING_IS_NOT_SOURCE_OF_TRUTH = true`

## Read models

- **Statement:** `FinanceManagementPnlReadModel` via `loadFinanceManagementPnlReadModel` (FIN-05C, unchanged semantics).
- **Detail (lazy):** `FinanceManagementReportingDetailReadModel` via `loadFinanceManagementReportingDetailReadModel` — composes FIN-05B/C measures and FIN-03B dated actual entries for one account or reporting group.

### Investigation targets

| Target | Detail exposes (permission-scoped) |
| --- | --- |
| **ACCOUNT** | Hierarchy context; Budget; Actual; Current Forecast; forecast-vs-budget variance; favourability; Actual evidence entries; secondary source navigation |
| **REPORTING_GROUP** | Group totals; child-account composition; material variance context; child-account investigation |

Actual evidence: tenant-scoped, account-scoped, financial-year scoped, YTD cutoff respected when applicable, deterministic chronological ordering, integer minor units in domain, locale formatting in presentation. No fabricated evidence; no technical fixture identifiers as user-facing descriptions.

## Interaction (final — do not reopen)

### R1 — Quiet investigation UX / driver-to-evidence

**Status:** **COMPLETE** — PO visual UAT **PASS**.

### R2 — Premium financial investigation sheet

**Status:** **COMPLETE** — PO visual UAT **PASS**.

Refines the FIN-05E detail Sheet into a financial explanation surface: compact identity in sheet chrome, forecast-vs-budget interpretation, inline actual period context, chronological Ist evidence with opaque technical descriptions filtered at presentation, optional reconciliation summary, progressive disclosure for long lists, restrained source-data links, and bounded desktop panel width (~720–780px).

Canonical grammar:

| Surface | Interaction |
|---------|-------------|
| **Material variance drivers** (`Wesentliche Abweichungen`) | Primary investigation entry — driver row opens FIN-05E detail for the resolved FIN-05B target. |
| **Account rows** | Quiet direct investigation — account identity is the control (no repeated textual action column). |
| **Reporting groups** | Explicit hierarchy expand/collapse **separate** from a quiet group investigation affordance. |
| **Management statement** | Numbers first — Budget → Ist → Prognose → Abweichung; no permanent action column. |

Detail opens in the canonical SCE **Sheet** (interpretation → explanation → evidence → secondary source routes). Statement remains visible behind the investigation surface. Optional deep links: `?account=` / `?group=` (validated server-side, tenant-scoped).

## Source authority (locked)

| Measure | Authority |
| --- | --- |
| Approved budget | FIN-02 governance baseline |
| Actual | FIN-03B dated Actual entries |
| Current forecast | Organisation-owned Current Forecast |
| Variance | FIN-05B semantic variance engine |
| Management P&L | FIN-05C |
| Expected timing | FIN-04E — linked only where appropriate (route to Zeitplanung; not a second timing workspace) |

FIN-05E must **not** mutate budget/actual/forecast, replace Current Forecast with Automatic Forecast, recalculate competing variance semantics in React, fabricate monthly phasing, infer hidden values, or introduce liquidity/statutory/publication/generic BI semantics.

## Boundaries (locked)

- No inline budget / actual / forecast editing in Berichte — routes to canonical workspaces.
- No liquidity projection (FIN-09).
- No publication / sharing (FIN-06).
- No balance sheet / journal semantics (FIN-11).
- No nested scrollbar hell; no source editing from Reporting.

## Performance

Main Reporting load: existing FIN-05C model/query shape. Investigation detail: lazy / open-on-demand. No per-row evidence queries; no N+1 loops; no generic reporting infrastructure layer.

## Tests

- `lib/finance/__tests__/finance-05e-management-reporting-detail.test.ts`
- `lib/finance/__tests__/finance-05e-r1-quiet-investigation-ux.test.tsx`
- `lib/finance/__tests__/finance-05e-r2-premium-investigation-sheet.test.tsx`
- `lib/finance/__tests__/finance-05e-reporting-architecture.test.ts`
- `lib/finance/__tests__/finance-05e-reporting-workspace-ux.test.tsx`
- `lib/finance/__tests__/finance-reporting-investigation-presentation.test.ts`

## FIN-09 note

Expected-event timelines in FIN-05D/FIN-04E are **timing intelligence**, not authoritative running liquidity. FIN-09 later owns opening balance + dated inflows/outflows + running projected balance.

## Next

**FIN-05F** — Forecast / Budget / Actual comparative intelligence (**COMPLETE / PO APPROVED** — PR **#913** → **STAGE**).

**FIN-05G** — Reporting visual intelligence & responsive hardening (**COMPLETE / PO APPROVED** — PR **#914** → **STAGE**).

**FIN-05H** — Release hardening (**NEXT / NOT STARTED**).
