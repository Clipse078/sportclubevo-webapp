# SCE Finance FIN-02B — Controlled Re-baselining

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-02b-controlled-rebaselining` |
| **Merge target** | `STAGE` |
| **PR** | **#897** |
| **Feature head at merge** | `ef176002ade511b911d83a47fca2e4dc87a4c649` (R1 `c0793029` … R2 `09e07585` … R3 `797819b6` … closure docs) |
| **Merge commit (STAGE)** | `989a6c1de619ee131a21d2a3d1a6d5c85b1c2503` (2026-10-23, PR **#897**) |
| **Builds on** | FIN-02A operational budgeting, FIN-01E reporting |
| **FIN-02B implementation** | **COMPLETE + MERGED (STAGE)** |
| **FIN_02B_PO_UAT** | **PASS** (Product Owner manual UAT — authoritative, 2026-10-23) |
| **FIN-02 programme status** | **IN PROGRESS** (02A–02C closed on STAGE; **02D** candidate not started) |

## PO UAT confirmation (2026-10-23 — closure)

Product Owner manual UAT **PASS** confirms acceptance of:

### Core re-baselining

- Approved **baseline v1** preserved as immutable historical approval history.
- **Working revision v2** remains editable while in DRAFT.
- Explicit governance action **Neue Baseline freigeben** (distinct from first **Baseline freigeben**).
- Confirmation dialog clearly explains that reporting will switch to the new baseline while history is preserved.
- After controlled approval, **v2** becomes the **current governance baseline**; **v1** stays historically approved and unchanged.
- Version history distinguishes **AKTUELLE BASELINE** vs **FRÜHERE BASELINE**; approved v2 becomes protected/read-only like v1.
- **Finance Overview** and management reporting resolve amounts from the **current** baseline (v2 after re-baseline).

**PO-observed example (illustrative):**

| | Income | Expense | Result |
| --- | --- | --- | --- |
| Previous baseline (v1) | 150'000 CHF | 75'000 CHF | 75'000 CHF |
| New approved baseline (v2) | 225'000 CHF | 75'000 CHF | 150'000 CHF |

### Financial year identity (R2)

- Tenant-defined **`FinanceYear.name`** accepted (e.g. **FY 2026**).
- Start/end dates independently configured.
- Financial-year identity is **not** stored as the generic concept label **Finanzjahr**.
- Finance Overview and budget selector use the configured year identity.

### Finance settings UX (R3)

- Configured financial years presented compactly; edit via intentional dialog; add-year via intentional create interaction.
- Year-specific configuration (**Finanzjahre**) clearly separated from tenant-wide **Funktionen** (capabilities independent of financial year).
- Budget year selector (**FY 2026**) renders without vertical clipping (shared **SceToolbarSelect** correction).

Cursor did not invent additional manual UAT evidence beyond this Product Owner sign-off.

## PO UAT finding (FIN-02B R2) — financial year identity

During PO UAT, STAGE showed a generic concept label (`Finanzjahr`) as if it were the saved financial-year identity (selector and overview: `Finanzjahr: Finanzjahr · CHF`).

**Root cause:** Category **B** — the domain model already had `FinanceYear.name`, but setup UX pre-filled the create form with the translated concept label (`settings.financeYearDefaultName`), which tenants saved as business data. There was no settings path to edit an existing year’s display name.

**Resolution (R2):**

| Rule | Detail |
| --- | --- |
| **Canonical identity** | `FinanceYear.id` (stable) + tenant-owned **`name`** + **`startDate`** + **`endDate`** |
| **No inference** | Display name is never derived from locale, country, calendar year, season, or dates after save |
| **Settings UX** | Empty name placeholder on create; list configured years with name + dates; save updates |
| **Display contract** | User-facing surfaces show **`name`** (e.g. `FY 2026 · CHF`), not the i18n concept label |
| **Mutability** | **Rename** always allowed (same id). **Period change** blocked when any **APPROVED** budget version exists for that year |
| **Reporting** | Resolution remains by `financeYearId` / version ids — rename does not alter baselines |

## PO UAT finding (FIN-02B R3) — settings scope + year selector clipping

During PO UAT on STAGE preview:

1. **Finance → Einrichtung** mixed year-specific controls (Finanzjahre) with organisation-wide **Funktionen** in one undifferentiated workspace, so tenants could infer capabilities were scoped to the selected financial year.
2. **Finance → Budget** financial-year selector clipped the selected label vertically (e.g. `FY 2026`).

**Resolution (R3):**

| Area | Detail |
| --- | --- |
| **Settings IA** | Separate surfaces: `settings-years` (Finanzjahre) vs `settings-capabilities` (Funktionen, tenant-wide copy) |
| **Configured years** | Compact list: name + formatted period + **Bearbeiten** → dialog (name always editable; dates locked when policy requires) |
| **Add year** | `+ Finanzjahr hinzufügen` opens canonical **Dialog** create flow (no permanently expanded form) |
| **Capabilities** | Explicit i18n: settings apply **unabhängig vom Finanzjahr**; persistence unchanged (`FinanceTenantCapability`) |
| **Selector clipping** | Root cause: `.fca-select` vertical padding on `.sce-toolbar-select` with fixed `h-9` — fixed in shared toolbar select CSS (`padding-block`, `line-height`) |

## Purpose

When an organisation has an **approved governance baseline v1** and prepares a **working revision v2**, FIN-02B defines how v2 becomes the **current** governance baseline without mutating, deleting, or rewriting v1.

```text
APPROVED BASELINE v1 (historical, immutable)
  → WORKING REVISION v2 (DRAFT)
  → readiness / review
  → controlled approval (re-baseline)
  → APPROVED BASELINE v2 (current)
```

**Semantic lock:** **Approval history** (all APPROVED versions) **≠** **current governance baseline** (single pointer).

Canonical current identity: **`FinanceBudget.currentBaselineVersionId`**.

## Current baseline semantic

| Concept | Meaning |
| --- | --- |
| **APPROVED** | Version was formally approved; immutable lines + frozen `baseCurrency` + audit fields |
| **Current governance baseline** | The single APPROVED version whose amounts govern live management reporting |

After re-baselining, **multiple APPROVED versions** may exist. Only the **current baseline pointer** identifies which one governs.

## Data model decision

**Chosen:** `FinanceBudget.currentBaselineVersionId` → `FinanceBudgetVersion` (optional, unique).

**Rejected:**

- Richer version status encoding “was current” — older versions remain **APPROVED**, not demoted to a synthetic status.
- Overloading “latest APPROVED by version number” — ambiguous under concurrency and partial failure.

**Invariants (service + DB where feasible):**

1. At most one current baseline per budget (unique pointer column).
2. Pointer references a version on the same budget (FK + service validation).
3. Pointer must reference an **APPROVED** version (service validation on transition).
4. Historical APPROVED versions are never edited to reflect new numbers.
5. DRAFT versions cannot govern reporting.
6. Tenant boundaries enforced on approval and pointer updates.
7. Re-baseline is transactional; prior baseline rows remain unchanged; approval metadata preserved per version.
8. No “latest APPROVED wins” heuristic when pointer is ambiguous.

**Migration:** `20261022210000_sce_finance_02b_current_governance_baseline` — SQL backfill sets the pointer when **exactly one** APPROVED version exists per budget. Multiple APPROVED without pointer is **not guessed** — reporting returns no baseline until resolved manually.

### STAGE migration (R1 deployment)

Shared STAGE must apply the FIN-02B migration **before** Preview UAT on code that selects `FinanceBudget.currentBaselineVersionId`. Operator procedure: `docs/deployment/stage-preview-migration-runbook.md` (guarded `db:migrate:deploy-if-enabled`).

**Closure record (designated STAGE, 2026-10-23):**

| Check | Result |
| --- | --- |
| `MIGRATION_APPLIED_TO_STAGE` | **YES** (`migrate status` up to date; ledger row present) |
| `DRAFT_POINTERS` | **0** |
| `CROSS_BUDGET_POINTERS` | **0** |
| `CROSS_TENANT_POINTERS` | **0** |
| `BROKEN_POINTERS` | **0** |
| `UNEXPECTED_UNRESOLVED_SINGLE_APPROVED` | **0** |

Production: **untouched** (no FIN-02B migration apply on Production as part of this closure).

## Transaction

`approveBudgetVersion` runs in a Prisma transaction:

1. Validate readiness (first approval vs re-baseline mode).
2. Flush pending line saves (FIN-02A persistence contract) before governance transition.
3. `UPDATE` version `DRAFT → APPROVED` with frozen currency + audit (conditional on `status = DRAFT`).
4. `UPDATE` budget `currentBaselineVersionId` to the new version.

Failure before commit leaves the prior current baseline unchanged.

## Readiness

Shared checks: currency, draft status, lines, amounts, archived warnings.

| Mode | Extra rule |
| --- | --- |
| **FIRST_APPROVAL** | Block if current baseline already exists |
| **REBASELINE** | Require existing current baseline; do **not** block merely because another APPROVED version exists |

## UX

- First approval: **Baseline freigeben** (unchanged FIN-02A copy).
- Re-baseline: **Neue Baseline freigeben** with dialog explaining history preservation and reporting switch.

## Reporting (blocking contract)

| Phase | Behaviour |
| --- | --- |
| Before re-baseline | `resolveApprovedBudgetMeasure` / `loadApprovedBudgetReportingReadModel` resolve **v1** via `currentBaselineVersionId` |
| DRAFT v2 | Excluded from reporting resolution |
| After re-baseline | Reporting resolves **v2**; **v1** remains queryable and unchanged |

`reportingContextKey` includes the resolved version id — it changes when the current baseline changes. Finance Overview follows the same pointer semantics.

Automated coverage: `lib/finance/__tests__/finance-02b-controlled-rebaseline.test.ts`, `finance-01e-reporting.test.ts`, `finance-year-identity.test.ts`.

## Financial year contract

```text
FINANCIAL YEAR =
  stable FinanceYear.id
  + tenant-defined FinanceYear.name
  + startDate
  + endDate
```

Identity is **not** inferred from country, locale, sport season, calendar year, or dates alone.

| Rule | Enforcement |
| --- | --- |
| Rename preserves stable id | Service + tests |
| Rename does not alter budget/reporting relationships | Reporting keys use ids |
| Period change blocked after approved financial history | Policy in year service |
| Rename remains allowed | Settings dialog |
| Invalid periods / blank names rejected | Validation |

## Settings scope contract

| Setting | Scope |
| --- | --- |
| **Basiswährung** | Tenant-wide (`FinanceConfiguration`) |
| **Finanzjahre** | Year-specific period definitions (`FinanceYear`) |
| **Funktionen** | Tenant-wide (`FinanceTenantCapability`) |
| **Einrichtung completion** | Tenant-wide readiness |

No capability uses `financeYearId` semantics. No year selector on **Funktionen**.

## Persistence & performance (FIN-02A retained)

| Interaction | Behaviour |
| --- | --- |
| `onChange` | Local state only |
| blur / Enter | Persistence |
| States | Ungespeicherte Änderungen · Wird gespeichert … · Gespeichert · Speichern fehlgeschlagen |

Governance approval / re-baseline flushes pending saves first. No mutation per keystroke; no `router.refresh` per line save; local totals; stale-response protection.

## Permissions

Editing the working budget (`finance.budget.manage`) **≠** authority to approve / re-baseline. Re-baseline requires **`finance.approve`** (permission key, no role-name hardcoding).

## Scope exclusions (FIN-02B did not implement)

Prior-year copy · annual budget cloning · budget notes/comments · multidimensional/cost-center budgeting · Actuals · Variance · Periodic Review · Forecast · Scenarios · Import · Publishing · statutory accounting · ASSET · LIABILITY · EQUITY · Balance Sheet · Sponsor/Commercial.

**FIN-01F** import foundation remains **BACKLOG / LOW PRIORITY**.

## Future compatibility (not started)

| Package | Candidate scope |
| --- | --- |
| **FIN-02C** | Annual budget creation & prior-year copy |
| **FIN-02D** | Budget notes / explanations |
| **FIN-03** | Actuals, variance & periodic budget control |
| **FIN-04** | Rolling forecast & scenarios |
| **FIN-05** | Financial reporting & intelligence (Management P&L / Erfolgsrechnung) |
| **FIN-06** | Financial publishing & sharing |
| **FIN-11** | Accounting, balance sheet & financial statements (future ASSET / LIABILITY / EQUITY) |

## Binary control compliance

```text
=== BINARY_CONTROL_COMPLIANCE ===
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES (SwitchToggle / FINANCE_DESIGN_SYSTEM)
MULTI_SELECTION_PATTERN = CHECKBOX_WHEN_MULTI_OR_ROW_SELECTION (unchanged programme rule)
```

## FIN-03 contract (not implemented)

Variance policy when baseline changes mid-year belongs in FIN-03. FIN-02B preserves distinct version ids, per-version approval timestamps, and historical APPROVED snapshots.

## FIN-06 contract (not implemented)

Published snapshots must bind to a **specific budget version id** at publication time. Re-baselining must not retroactively change published artifacts.

## Closure validation (2026-10-23)

| Gate | Result |
| --- | --- |
| Finance regression (FIN-01B…FIN-02B paths) | **PASS** (236 tests, finance-related vitest) |
| Design system governance | **PASS** |
| Changed-path ESLint | **PASS** (0 errors) |
| `npm run build` | **PASS** |

## Roadmap

| Item | State |
| --- | --- |
| FIN-02A | COMPLETE + MERGED + PO UAT PASS |
| FIN-02B | **COMPLETE + MERGED + PO UAT PASS** (PR **#897** → **STAGE**) |
| FIN-02C | **COMPLETE + MERGED + PO UAT PASS** (PR **#899** → **STAGE**) — see [`SCE-FINANCE-02C-IMPLEMENTATION.md`](./SCE-FINANCE-02C-IMPLEMENTATION.md) |
| FIN-02D | Candidate / **NOT STARTED** |
| FIN-01F | BACKLOG / LOW PRIORITY |
| FIN-03+ | **NOT STARTED** |
