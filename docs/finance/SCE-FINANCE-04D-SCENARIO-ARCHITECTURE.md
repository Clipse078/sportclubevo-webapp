# SCE-FINANCE-04D — Scenario & What-if Architecture

| Field | Value |
| --- | --- |
| **Package** | FIN-04D programme — **04D-01** architecture (this document); **04D-02** persistence; **04D-03** engine; **04D-04** query; **04D-05** workspace UX |
| **Status** | **04D-01 … 04D-06** — **04D-05R1 PO UAT PASS**; **04D-06 READY FOR PO UAT** — [`SCE-FINANCE-04D-06-SCENARIO-ADOPTION-AND-REBASE.md`](./SCE-FINANCE-04D-06-SCENARIO-ADOPTION-AND-REBASE.md); forecast timing direction: [`SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md`](./SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md) |
| **Branch** | `cursor/sce-finance-04d-scenarios-what-if` |
| **Base** | `STAGE` (post FIN-04C merge `c635f1c0`) |
| **Implementation code** | **04D-01:** `scenario-architecture-contract.ts`, `scenario-assumption-calculation.ts` — **04D-03:** `calculate-finance-scenario.ts`, `finance-scenario-calculation-types.ts` |

## Executive summary

FIN-04D introduces **Scenarios** — hypothetical management models that answer *What happens if…?* without blurring **Approved Budget**, **Actual**, **Automatische Prognose**, **Aktuelle Prognose**, or **formal reforecast history**.

**Canonical principle (locked):**

> A scenario is a hypothetical management model. It is not the current forecast, not an approved budget, not an automatic forecast, not actual, and does not become reality merely by being created.

Code locks: `SCE_SCENARIO_ARCHITECTURE_LOCKS` in `scenario-architecture-contract.ts`.

---

## 1. Integration map (existing FIN architecture)

| Programme | Role for FIN-04D |
| --- | --- |
| **FIN-02 Approved Budget** | Secondary comparison (`SCENARIO vs APPROVED_BUDGET`); never mutated by scenarios |
| **FIN-03 Actual** | Truthful measured outcomes; cutoff metadata on scenario baseline; does not rewrite frozen baseline |
| **FIN-04A Current Forecast** | Primary baseline **reference**; `FinanceForecast.currentVersionId` → CURRENT version |
| **FIN-04B Automatische Prognose** | Separate measure; evidence/reference only in v1 — not a scenario start baseline |
| **FIN-04C Rolling forecast** | Formal revisions (`Neue Prognose festhalten`); **no** `scenarioKey` on ordinary revisions; Prognoseverlauf excludes scenarios |

**Shared primitives reused:**

- Account identity: `FinancialAccount.id`
- Annual grain: `FinanceForecastLine.amountMinor` semantics
- Totals: income / expense / result aggregation patterns (`computeBudgetPlanningTotals`)
- Comparison delta: **comparison − base** (`forecast-revision-comparison.ts`) — favorability in presentation layer only
- Permissions: `finance.forecast.view` / `finance.forecast.manage` under **FORECASTING** capability
- Workspace route: `/dashboard/finance/forecast` (Prognose)

---

## 2. What is a Finance Scenario?

| Question | Answer |
| --- | --- |
| **Definition** | Tenant-owned, `FinanceYear`-scoped analytical container that applies explicit **assumptions** to a **frozen baseline** to produce deterministic full-year account amounts |
| **Identity** | Stable `FinanceScenario.id` (proposed FIN-04D-02) |
| **Ownership** | `tenantId` + `financeYearId` |
| **Contains** | Name, optional description, baseline provenance, frozen baseline lines, assumptions (intent), derived results |
| **Editable?** | Yes while active — assumptions and metadata (not governance baseline) |
| **Archived?** | Yes — `archivedAt` (no DRAFT/CURRENT/APPROVED scenario states) |
| **Duplicated?** | Yes — intentional fork of assumptions + optional fresh baseline snapshot |
| **Deleted?** | Hard delete when safe; restricted when adoption provenance exists (future) |
| **Versions?** | **LIGHTWEIGHT** — `updatedAt` / `updatedByUserId`; no immutable scenario version chain in v1 |
| **Draft/published?** | **No** — scenarios are analytical, not governance checkpoints |
| **Formal governance history?** | **No** — unlike formal reforecasts; adoption into current forecast creates **forecast** revision history separately |
| **vs Current Forecast revision history** | Reforecasts record what the organisation **expects**; scenarios explore **hypotheticals** without entering Prognoseverlauf until explicit adoption |
| **Provenance** | Baseline reference (`baselineForecastVersionId`, Datenstand, optional `actualsThroughDate`) |
| **Stable if Current Forecast changes?** | **Yes** — frozen baseline lines remain; optional “baseline outdated” indicator; explicit rebase deferred to FIN-04D-06 |

---

## 3. Baseline / reference semantics

### Primary baseline (v1)

**Aktuelle Prognose** at scenario creation — because the default management question is: *What if our **current expectation** changed?*

### Hybrid REFERENCE + SNAPSHOT (canonical)

Snapshot strategy code lock: `REFERENCE_PLUS_FROZEN_BASELINE_LINES` (`SCENARIO_BASELINE_POLICY.snapshotStrategy`).

1. **Reference** — record `baselineReferenceKind`, `baselineForecastVersionId`, `asOfDate`, optional `actualsThroughDate`, currency.
2. **Snapshot** — persist `FinanceScenarioBaselineLine` rows (frozen `amountMinor` per account at creation).

This avoids **dynamic historical dishonesty**: if Current Forecast later moves from V3 → V4, the scenario still means *“−10% from the expectation we had when we created this scenario (V3, Datenstand …)”*.

### Comparison hierarchy

| Tier | Pair | Default UX |
| --- | --- | --- |
| **Primary** | Scenario result vs **frozen baseline** | Single headline result delta + top drivers |
| **Secondary** | Scenario result vs **Approved Budget** | On demand / budget-fit context |
| **Tertiary (deferred)** | Scenario vs Scenario | **DEFERRED in v1** (`SCENARIO_QUERY_LAYER.scenarioToScenarioComparisonV1`) |
| **Context only** | Live Current Forecast | Labelled clearly — not a silent replacement for frozen baseline |

Delta formula remains **comparison − base**. Favorability stays presentation-only.

### Automatic Forecast as baseline

**Excluded from v1** scenario creation — reduces user confusion between Automatische Prognose, Aktuelle Prognose, and Szenario. May appear later as optional comparison/reference.

### Approved Budget as baseline

Deferred as a **start reference**; supported as **secondary comparison**.

---

## 4. Scenario stability policy

**When:** Scenario created from Current Forecast V3; organisation later formalizes V4.

**Policy:** **Remain on V3 baseline** (frozen lines + metadata). Show baseline outdated indicator when live current differs. **No silent rebase.**

**Future (FIN-04D-06):** Explicit **Auf aktuelle Prognose aktualisieren** — user confirms; assumptions carried forward; conflicts surfaced; new frozen snapshot.

---

## 5. Assumption model (v1)

Avoid copying the entire forecast grid to change one answer.

### Annual semantics (locked)

FIN-04D v1 assumptions are **annual forecast assumptions** on full-year `FinancialAccount` amounts.

| Kind | Semantics (full financial year) | Requires baseline line? |
| --- | --- | --- |
| `PERCENT_CHANGE` | Change the **expected full-year** account amount by the specified percentage | Yes |
| `DELTA_AMOUNT` | Change the **expected full-year** account amount by the specified delta (minor units) | Yes |
| `ABSOLUTE_AMOUNT` | Set the **expected full-year** account amount to the specified amount | No (may create scenario line) |
| `EXCLUDE_ACCOUNT` | Set the **expected full-year** account amount to **zero** | No |

**Not in v1 (explicit non-meaning):**

- change from a specific date; remaining-months-only change; monthly phasing; cash timing; particular payment/receipt events; retroactive change to realized actuals.

**Do not add** `effectiveFrom` / `effectiveTo` / `startDate` / `endDate` on `FinanceScenarioAssumption` until a temporal engine exists — see [`SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md`](./SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md).

**Locked principle:**

```text
ANNUAL EXPECTATION ≠ EXPECTED CASH TIMING ≠ EFFECTIVE-DATE ASSUMPTION
```

**No naive month proration:** do not infer impact via `annual × remaining months / 12` unless evidence establishes even periodic distribution.

**Rules:**

- One assumption per account (v1)
- Intent stored separately from calculated/scenario result amounts
- Percent stored as **basis points** (scale 10 000 = 100%)
- Deterministic application order: `financialAccountId` ascending, then assumption id
- Rounding: `roundRationalToMinor` (integer minor units — no float money)

**Extension boundary (future):** optional `driverRef` / driver kinds and **time-based assumptions** on expected financial events — v1 remains `FinancialAccount` + annual amount; no generic rules engine.

---

## 6. Result calculation

For each account:

```text
baselineAmountMinor  +  assumptionTransform  →  scenarioAmountMinor
```

- Integer minor units only (`assertSafeAmountMinor`)
- `null` baseline ≠ zero — percent/delta rejected without baseline
- Negative amounts allowed where existing Finance semantics allow
- No FX conversion
- No LLM numerical engine — deterministic code only

Optional persisted cache: `FinanceScenarioResultLine` (derived; recomputable from baseline + assumptions).

---

## 7. Lifecycle

| State | Meaning |
| --- | --- |
| **Active** | `archivedAt` null — editable |
| **Archived** | `archivedAt` set — read/compare; restore allowed |

Actions: CREATE, EDIT (assumptions/metadata), DUPLICATE, RENAME, ARCHIVE, RESTORE, DELETE (when no adoption lock), COMPARE.

**Versioning:** `LIGHTWEIGHT` — audit via `updatedAt`; duplicate for intentional alternatives; formal audit on adoption via forecast revision + `FinanceScenarioAdoption`.

---

## 8. Scenario → Current Forecast (future)

**Not in FIN-04D-01.** Future explicit **Als aktuelle Prognose übernehmen**:

```text
Scenario  →  explicit adoption  →  formal forecast revision  →  new CURRENT
```

Provenance in `FinanceScenarioAdoption`. Never mutates Approved Budget.

---

## 9. Automatic Forecast & Actuals

| Topic | Policy |
| --- | --- |
| **Automatic Forecast** | Does not mutate scenario assumptions; not a v1 start baseline; optional future compare |
| **Actuals after creation** | Do not silently change frozen baseline; display Datenstand / actuals-through metadata |
| **Timed cash / phasing** | **Out of scope in v1** — annual scenario modelling only; future timing intelligence documented in [`SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md`](./SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md) (FIN-04 / FIN-07 / FIN-08 / FIN-09); **no naive month proration** |

---

## 10. Persistence proposal (FIN-04D-02 — no migration in 04D-01)

Dedicated models ( **not** storing scenarios as ordinary `FinanceForecastVersion` rows):

| Model | Purpose |
| --- | --- |
| `FinanceScenario` | Container + baseline provenance + lifecycle |
| `FinanceScenarioBaselineLine` | Frozen baseline amounts |
| `FinanceScenarioAssumption` | User intent |
| `FinanceScenarioResultLine` | Optional derived cache |
| `FinanceScenarioAdoption` | Future adoption audit |

FIN-04A `FinanceForecastVersion.scenarioKey` remains a **legacy hook** — canonical scenarios use dedicated tables (`financeForecastVersionScenarioKeyNotCanonicalScenarioStore`).

---

## 11. Concurrency

- Optimistic concurrency via scenario `updatedAt` token on edit/archive/adoption/rebase
- Stale clients must refresh — no silent overwrite
- Archive during edit → conflict

---

## 12. Permissions

Reuse FIN-04A/04B/04C:

| Action | Permission |
| --- | --- |
| View, compare | `finance.forecast.view` |
| Create, edit, duplicate, archive, delete | `finance.forecast.manage` |
| Adopt to current (future) | `finance.forecast.manage` |

---

## 13. Navigation & UX architecture

**Location:** Finance → **Prognose** — primary **Aktuelle Prognose**; secondary **Szenarien** (no new top-level Finance tab).

**SCE tests:**

- **10-second comprehension** — name + expected result + delta vs baseline
- **30-second investigation** — assumptions and account effects one disclosure away
- **No mental arithmetic** — SCE shows comparison deltas and drivers
- **Progressive disclosure** — conclusion → why → detail → evidence

**Creation flow (conceptual):** name/question → confirm baseline → add assumption → immediate result.

**Binary controls:** toggles for persistent binary settings; buttons/disclosures for progressive disclosure; checkboxes only for multi-row selection — **0 new binary checkboxes** in FIN-04D UX.

---

## 14. Package sequence

| Sub | Deliverable |
| --- | --- |
| **04D-01** | Architecture & domain contract (this package) |
| **04D-02** | Persistence & lifecycle (**COMPLETE**) |
| **04D-03** | Calculation & assumption engine |
| **04D-04** | Query & comparison layer |
| **04D-05** | Workspace UX |
| **04D-06** | Adoption & optional rebase |
| **04D-07** | Hardening & release closure |

---

## 15. Neutrality & AI boundary

No hardcoded currency, country, sport, or organisation-specific account semantics in core schema.

AI may explain or suggest assumptions in future — **never** the canonical numerical engine.

---

## Related documents

- [`SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md`](./SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md) — timing vs annual expectation; effective-date direction (not implemented)
- [`SCE-FINANCE-04D-02-SCENARIO-PERSISTENCE-AND-LIFECYCLE.md`](./SCE-FINANCE-04D-02-SCENARIO-PERSISTENCE-AND-LIFECYCLE.md) — Prisma models, lifecycle, migration
- [`SCE-FINANCE-04C-ROLLING-FORECAST-ARCHITECTURE.md`](./SCE-FINANCE-04C-ROLLING-FORECAST-ARCHITECTURE.md) — scenario boundary in §14
- [`SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md`](./SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md) — measure separation
- ADR-036 in [`docs/roadmap/05-architecture-decisions.md`](../roadmap/05-architecture-decisions.md)
