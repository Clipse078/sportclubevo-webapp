# SCE-FINANCE-03A — Actuals & Variance Foundation

| Field | Value |
| --- | --- |
| **Package** | FIN-03A |
| **Status** | **COMPLETE + PO UAT PASS + MERGED TO STAGE** |
| **Branch** | `cursor/sce-finance-03a-actuals-variance-foundation` |
| **Target** | STAGE |
| **PR** | **#900** → **STAGE** |
| **PO UAT** | **PASS** — 2026-10-23 |

## Product scope

Management finance actuals (measured outcomes) compared to the **current governance baseline** (FIN-02B). Not statutory accounting (FIN-11).

### Delivered

- `FinanceActualEntry` persistence (atomic actual grain, date provenance)
- Domain variance semantics (raw delta vs favorability)
- Full-year budget vs actual comparison mode
- YTD **actual** aggregation without fabricated budget phasing
- Manual actual CRUD vertical slice (`/dashboard/finance/actuals`)
- Permissions: `finance.actual.view`, `finance.actual.manage`
- ACTUALS capability surface (tenant enablement)

### Explicitly deferred (FIN-03B+)

- Periodic review workflow, variance explanations (FIN-02D backlog)
- Budget phasing / monthly allocation
- Import, bank, receivables/payment sourcing (FIN-08/09)
- General ledger / journal semantics (FIN-11)

## Architecture decisions

| Topic | Decision |
| --- | --- |
| Actual grain | `FinanceActualEntry` per account + finance year + `effectiveDate` |
| Variance storage | Derived only — not persisted |
| Sign | Income/expense actuals stored as **positive magnitude**; result = INCOME − EXPENSE |
| Raw delta | `actual − budget` |
| Favorability | INCOME: `rawDelta`; EXPENSE: `budget − actual` |
| YTD budget variance | **Not supported** until phasing exists |
| Re-baseline | Actuals bind to year/account/date; baseline resolved at read time |
| Currency | Must match tenant `FinanceConfiguration.baseCurrency` |
| Cost center | Optional future dimension — omitted in FIN-03A |
| Provenance | `FinanceActualEntrySource`: MANUAL, IMPORT, SYSTEM (create uses MANUAL) |

## Schema

See migration `20261023120000_sce_finance_03a_actuals_foundation`.

## STAGE migration (R1)

Shared STAGE must apply `20261023120000_sce_finance_03a_actuals_foundation` before PR Preview PO UAT (Preview builds do not run migrations). Operator procedure: `docs/deployment/stage-preview-migration-runbook.md`.

- Verify / apply: `npm run finance:03a:r1:stage-migration-verify` (read-only default; pass `--apply` with guarded env as documented in `scripts/sce-finance-03a-r1-stage-migration-verify.ts`).
- **2026-10-23:** migration applied on designated shared STAGE (`ep-wispy-hall-aso93dy6`, fingerprint `acd3b37682911890`).

## PO UAT hints

1. Enable **ACTUALS** capability in Finance settings.
2. Ensure approved baseline exists for a finance year.
3. Open **Finanzen → Ist** tab.
4. Record income/expense actuals; verify full-year variance table.
5. Switch to YTD mode — confirm no YTD budget variance label; annual budget remains reference.
6. Re-baseline budget — actual entries unchanged; variance uses new baseline.

## PO UAT findings (R2)

| # | Severity | Finding | R2 resolution |
| --- | --- | --- | --- |
| 1 | Blocker | No discoverable **Ist-Wert erfassen** action | Primary action in context strip (`ms-auto`), entries section header, and empty state; label **Ist-Wert erfassen**; dialog shows configured `FinanceYear.name` |
| 2 | UX | Flat variance table mixed income/expense with redundant **Typ** column | Split into **Einnahmen · {year}** then **Ausgaben · {year}**; **Typ** removed from comparison tables |
| 3 | UX | Finance year name not repeated in scrolled sections | Section headings use `{SECTION} · {FinanceYear.name}` pattern (aligned with FIN-02C-R1) |

R2 is UI-only: **no schema / migration changes**.

## PO UAT findings (R3)

| # | Severity | Finding | R3 resolution |
| --- | --- | --- | --- |
| 1 | UX | **Einnahmen** / **Ausgaben** variance tables misaligned (column geometry drifted per table) | Shared `finance-variance-comparison-table-layout` (`table-fixed` + common `colgroup`) consumed by both sections; German column label **Abweichung** |
| 2 | Blocker | Club Admin sees view-only hint; **Ist-Wert erfassen** hidden | Root cause: FIN-03A added `finance.actual.*` in catalog only (no FIN-01D-style migration backfill); designated STAGE had **38** missing `club_admin__*` assignments. **Code:** `finance.admin` now satisfies actual manage (parity with budget approve). **Data:** guarded `scripts/sce-finance-03a-r3-stage-permission-reconcile.ts --apply` via `reconcileFinancePermissions` |

R3: **SCHEMA_MIGRATION = NONE**; **PERMISSION_RECONCILIATION = REQUIRED** on shared STAGE (tenant-generic Club Admin alignment).

## PO UAT findings (R4)

| # | Severity | Finding | R4 resolution |
| --- | --- | --- | --- |
| 1 | UX | Three redundant **Ist-Wert erfassen** buttons (context strip, Ist-Buchungen header, empty state) | Single canonical create action retained in top context strip only; section header and empty state are informational |
| 2 | UX | Ist-Buchungen table weak column separation (Betrag/Beschreibung, cramped actions) | Shared `finance-actuals-bookings-table-layout` (`table-fixed` + `colgroup`, tabular-nums Betrag, scoped `overflow-x-auto`) |

R4: **SCHEMA_CHANGE = NONE**; **NEW_MIGRATION = NONE**; presentation/UX closure only.

## PO UAT findings (R5)

| # | Severity | Finding | R5 resolution |
| --- | --- | --- | --- |
| 1 | UX | Variance / favorability values were technically correct but visually neutral — users could not instantly see favorable vs unfavorable vs on-plan without interpreting raw delta sign | **Abweichung** and **Bewertung** share restrained DS-07 semantic text color derived from **canonical favorability** (`computeAccountVarianceMetrics`), never from raw delta sign. **FAVORABLE** → success semantic; **UNFAVORABLE** → danger semantic; **ON_PLAN** → neutral; missing comparison → muted. Localized labels: DE **Günstig** / **Ungünstig** / **Im Plan** (EN/FR/IT equivalents). Internal enum values unchanged. |

R5: **SCHEMA_CHANGE = NONE**; **NEW_MIGRATION = NONE**; presentation-only.

## PO UAT closure (2026-10-23)

Product Owner UAT **PASS** on designated shared STAGE Preview. Visually verified (example FY 2026):

| Concept | Einnahmen | Ausgaben | Ergebnis |
| --- | --- | --- | --- |
| Approved governance baseline | 225'000 CHF | 75'000 CHF | 150'000 CHF |
| Actual (Ist) performance | 0 CHF | 13'500 CHF | −13'500 CHF |

These figures represent **different concepts** — approved baseline vs measured actuals — and must not be conflated in UX or reporting.

**R1–R5** findings are **resolved**. **Production** was **not** promoted or modified during FIN-03A development / UAT. Shared STAGE migration `20261023120000_sce_finance_03a_actuals_foundation` was applied and verified (R1); no re-application at closure.

FIN-03A establishes **management actuals and variance foundation** only. It deliberately does **not** implement GL / debit-credit / balance-sheet accounting. **FIN-11** remains the future accounting boundary.

## Binary control compliance

```text
=== BINARY_CONTROL_COMPLIANCE ===
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES (SceSegmentedControl / FINANCE_DESIGN_SYSTEM)
SINGLE_CHOICE_PATTERN = SEGMENTED_CONTROL
MULTI_SELECTION_PATTERN = CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION (unchanged programme rule)
```

## Closure validation (2026-10-23)

| Gate | Result |
| --- | --- |
| FIN-01E regression | **PASS** (29 tests) |
| FIN-02A / 02B / 02C regression | **PASS** (26 tests) |
| FIN-03A regression (actuals, R1 guard, R3 layout/permissions, favorability, route contract) | **PASS** (51 tests) |
| Design system governance | **PASS** (287 tests + governance scan) |
| Changed-path ESLint | **PASS** (0 errors) |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run build` | **PASS** |

## Roadmap linkage

| Item | Status |
| --- | --- |
| FIN-01A–E | COMPLETE |
| FIN-01F | BACKLOG / LOW PRIORITY |
| FIN-02A–C | COMPLETE + PO UAT PASS |
| FIN-02D | DEFERRED / BACKLOG |
| FIN-02 | COMPLETE |
| **FIN-03A** | **COMPLETE + PO UAT PASS** (PR **#900** → **STAGE**) |
| FIN-03 | IN PROGRESS |
| FIN-03B | NOT STARTED |
| FIN-04 | NOT STARTED |
