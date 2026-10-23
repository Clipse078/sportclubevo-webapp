# SCE-FINANCE-02C — Annual Budget Creation & Prior-Year Copy

| Field | Value |
| --- | --- |
| **Package** | FIN-02C |
| **Status** | **IMPLEMENTED / PO UAT FINAL RETEST PENDING** |
| **Branch** | `cursor/sce-finance-02c-annual-budget-creation` |
| **Target** | `STAGE` |

## Product outcome

Organisations can intentionally create a **new financial year working budget** either as:

1. **Empty budget** — canonical `FinanceBudget` + initial `DRAFT` `FinanceBudgetVersion` (no pre-materialised lines; FIN-01D semantics preserved).
2. **Prior-year copy** — one-time copy of amounts from the **current governance baseline** (`FinanceBudget.currentBaselineVersionId`) of an eligible preceding `FinanceYear`.

Source and target remain **fully independent** after creation. No live inheritance or cross-year sync.

## Domain contract

- Target `FinanceYear` must already exist (no silent year creation).
- One `FinanceBudget` per `(tenantId, financeYearId)` — duplicates return `FINANCE_BUDGET_ALREADY_EXISTS`.
- Copy source must resolve through `currentBaselineVersionId` (never “latest approved” heuristics).
- Preceding year selection uses **date ordering** (`endDate < target.startDate`), not display names.
- Archived account lines are **skipped**; exclusion counts are returned to the UI.
- Organisation **base currency** governs new working budgets; cross-currency copy is rejected (no FX).
- Creation requires `finance.budget.manage` only (copying an approved baseline into a DRAFT is planning).

## Provenance (audit)

| Decision | Value |
| --- | --- |
| **SCHEMA_CHANGE_REQUIRED** | **NO** |
| **Rationale** | `createdByUserId` / timestamps on budget + version plus action result summary are sufficient for operational audit; no synchronisation field added. |
| **LIVE_COUPLING** | **NO** |

## UX

- Year without budget shows explicit empty state for that year (no fallback to another year).
- **Budget erstellen** opens a dialog with **SceSegmentedControl** (empty vs prior-year copy).
- Prior-year template select shows `{year} · Aktuelle Baseline`.
- Budget table section headings carry the selected financial year beside the section label (e.g. `Einnahmen · FY 2027`) using canonical `FinanceYear.name` from the workspace snapshot — not dates, sport season, or locale-derived labels.

### PO UAT finding (R1)

**Finding:** When scrolling the budget workspace, income/expense headings showed only `Einnahmen` / `Ausgaben`, so the active Finanzjahr was ambiguous with multiple years configured.

**Resolution (FIN-02C-R1):** Section headings use `incomeSectionWithYear` / `expenseSectionWithYear` with `{year}` = resolved `snapshot.financeYearName`. Headings wrap safely (`break-words`) for long tenant names such as `Geschäftsjahr 2026/2027`.

## Tests

- `lib/finance/budget/__tests__/annual-budget-copy-sources.test.ts`
- `lib/finance/__tests__/finance-02c-annual-budget.test.ts`
- Finance regression: FIN-01D / 01E / 02A / 02B suites

## Roadmap linkage

| Item | Status |
| --- | --- |
| FIN-02A | COMPLETE + MERGED + PO UAT PASS |
| FIN-02B | COMPLETE + MERGED + PO UAT PASS |
| **FIN-02C** | **IMPLEMENTED / PO UAT FINAL RETEST PENDING** |
| FIN-02D | Candidate / NOT STARTED |
| FIN-01F | BACKLOG / LOW PRIORITY |
| FIN-03+ | NOT STARTED |
