# SCE-FINANCE-02C — Annual Budget Creation & Prior-Year Copy

| Field | Value |
| --- | --- |
| **Package** | FIN-02C |
| **Feature branch** | `cursor/sce-finance-02c-annual-budget-creation` |
| **Merge target** | `STAGE` |
| **PR** | **#899** |
| **Feature head at closure** | `6744fbe0c18f20c845bd914bbbb525fbff5bb5aa` (core `20595af8` … dialog reset `6d0addc1` … R1 `96824f4b` … R1 test `6744fbe0` … closure docs) |
| **Merge commit (STAGE)** | *(recorded post-merge on STAGE — see closure commit after PR #899)* |
| **FIN-02C implementation** | **COMPLETE + MERGED + PO UAT PASS** *(merge SHA on STAGE)* |
| **FIN_02C_PO_UAT** | **PASS** (Product Owner manual UAT — authoritative, 2026-10-23) |
| **FIN-02 programme status** | **IN PROGRESS** (02A–02C closed on STAGE; **02D** candidate not started) |

## PO UAT confirmation (2026-10-23 — closure)

Product Owner manual UAT **PASS** confirms acceptance of:

### Annual budget creation

- Tenant can create a new **FinanceYear** independently (prerequisite; FIN-02C does not silently create years).
- **FY 2027** was created explicitly as the target financial year.
- Budget selector exposes configured financial years.
- Financial year **without** budget shows an explicit empty state (no fallback to another year).
- **Budget erstellen** / annual budget creation dialog works.
- **Empty-budget** path is available.
- **Prior-year copy** path is available.
- **FY 2026** current governance baseline can be selected as copy source.

### Prior-year copy behaviour

- Copied **FY 2027** budget initially contained:
  - **Einnahmen:** 225'000 CHF
  - **Ausgaben:** 75'000 CHF
- Copied target budget is **independent** from its source after creation.
- Editing **FY 2027** did **not** mutate **FY 2026**.
- Copied budget remains **DRAFT** until explicitly approved.
- **FIN-02B** governance baseline semantics remain intact.

### Visual context (FIN-02C-R1)

Product Owner visual UAT **PASS**:

| Year | Section headings (example) |
| --- | --- |
| FY 2027 | `Einnahmen · FY 2027`, `Ausgaben · FY 2027` |
| FY 2026 | `Einnahmen · FY 2026`, `Ausgaben · FY 2026` |

Configured **`FinanceYear.name`** remains visible as direct budget context when the year selector is outside the viewport.

Cursor did not invent additional manual UAT evidence beyond this Product Owner sign-off.

## Product outcome

Organisations can intentionally create a **new financial year working budget** either as:

1. **Empty budget** — canonical `FinanceBudget` + initial `DRAFT` `FinanceBudgetVersion` (no pre-materialised lines; FIN-01D semantics preserved).
2. **Prior-year copy** — one-time copy of amounts from the **current governance baseline** (`FinanceBudget.currentBaselineVersionId`) of an eligible preceding `FinanceYear`.

Source and target remain **fully independent** after creation. No live inheritance or cross-year sync.

## Final domain contract

```text
FinanceYear
  → optional annual FinanceBudget
    → FinanceBudgetVersion
      → FinanceBudgetLine
        → FinancialAccount
```

### Annual creation semantics

| Path | Behaviour |
| --- | --- |
| **TARGET FINANCIAL YEAR → CREATE EMPTY WORKING BUDGET** | New `FinanceBudget` + initial DRAFT version for an existing year. |
| **TARGET FINANCIAL YEAR → COPY CURRENT GOVERNANCE BASELINE FROM ELIGIBLE PRIOR YEAR → CREATE INDEPENDENT WORKING BUDGET** | One-time copy of planned amounts from source `currentBaselineVersionId`; target stays DRAFT. |

### Critical invariants

1. **One `FinanceBudget` per tenant + `FinanceYear`.**
2. **`FinanceYear` must already exist.** FIN-02C must not silently create financial years.
3. **Prior-year copy is ONE-TIME COPY**, not live coupling.
4. **Source is a resolvable CURRENT GOVERNANCE BASELINE** (`currentBaselineVersionId`). Do not use ambiguous / “latest APPROVED” semantics.
5. **Copied target remains DRAFT.** It does not become reporting baseline until explicitly approved (FIN-02A / FIN-02B path).
6. **Copy scope:** copies planned amounts; copies only eligible **ACTIVE** accounts; skips archived accounts; does **not** clone accounts, reporting groups, `FinanceYears`, approval metadata, or `currentBaselineVersionId`.
7. **Source and target become independent immediately** after creation.
8. **Currency mismatch is rejected.** No implicit FX conversion.
9. **`FinanceYear.name` is tenant-owned presentation identity.** Do not derive from dates, sport season, locale, or country.
10. **Budget section context** uses canonical `FinanceYear.name` (FIN-02C-R1).
11. **FIN-02A approval** and **FIN-02B controlled re-baselining** remain the governance path after annual budget creation.

## Provenance (audit)

| Decision | Value |
| --- | --- |
| **SCHEMA_CHANGE_REQUIRED** | **NO** |
| **SCHEMA_MIGRATION** | **NONE** |
| **Rationale** | `createdByUserId` / timestamps on budget + version plus action result summary are sufficient for operational audit; no synchronisation field added. |
| **LIVE_COUPLING** | **NO** |

## UX

- Year without budget shows explicit empty state for that year (no fallback to another year).
- **Budget erstellen** opens a dialog with **SceSegmentedControl** (empty vs prior-year copy).
- Prior-year template select shows `{year} · Aktuelle Baseline`.
- Budget table section headings carry the selected financial year beside the section label (e.g. `Einnahmen · FY 2027`) using canonical `FinanceYear.name` from the workspace snapshot — not dates, sport season, or locale-derived labels.

### PO UAT finding (R1)

**Finding:** When scrolling the budget workspace, income/expense headings showed only `Einnahmen` / `Ausgaben`, so the active Finanzjahr was ambiguous with multiple years configured.

**Resolution (FIN-02C-R1):** Section headings use `incomeSectionWithYear` / `expenseSectionWithYear` with `{year}` = resolved `snapshot.financeYearName`. Headings wrap safely (`break-words`) for long tenant names such as `Geschäftsjahr 2026/2027`. Budget editor remounts on year switch (automated UX test).

## Permissions

| Permission | Role |
| --- | --- |
| `finance.view` / `finance.budget.view` | View workspace and year list |
| `finance.budget.manage` | Create empty budget; create prior-year copy (planning — source may be approved baseline) |
| `finance.approve` / `finance.admin` | Approve baseline after creation (FIN-02A / FIN-02B — unchanged) |

No hardcoded treasurer / Vorstand roles.

## Binary control compliance

```text
=== BINARY_CONTROL_COMPLIANCE ===
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES (SceSegmentedControl / FINANCE_DESIGN_SYSTEM)
MULTI_SELECTION_PATTERN = CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION (unchanged programme rule)
```

## Tests

- `lib/finance/budget/__tests__/annual-budget-copy-sources.test.ts`
- `lib/finance/__tests__/finance-02c-annual-budget.test.ts`
- Finance regression: FIN-01D / 01E / 02A / 02B / 02C paths (`vitest run lib/finance`)
- `components/admin/finance/__tests__/FinanceBudgetWorkspacePanel.ux.test.tsx` — FIN-02C-R1 year context

## Closure validation

*(Automated gates recorded at closure — 2026-10-23)*

| Gate | Result |
| --- | --- |
| Finance regression (FIN-01D…FIN-02C + copy-sources + workspace UX) | *(see closure run)* |
| Design system governance | *(see closure run)* |
| Changed-path ESLint | *(see closure run)* |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run build` | *(see closure run)* |

## Roadmap linkage

| Item | Status |
| --- | --- |
| FIN-02A | COMPLETE + MERGED + PO UAT PASS |
| FIN-02B | COMPLETE + MERGED + PO UAT PASS |
| **FIN-02C** | **COMPLETE + MERGED + PO UAT PASS** (PR **#899** → **STAGE**) |
| FIN-02D | Candidate / **NOT STARTED** |
| FIN-01F | BACKLOG / LOW PRIORITY |
| FIN-03+ | **NOT STARTED** |
