# SCE-FINANCE-04B — SCE Projection Engine Architecture & Contract

| Field | Value |
| --- | --- |
| **Package** | FIN-04B programme — **04B-01** architecture; **04B-02** persistence; **04B-03** evidence & sufficiency |
| **Status** | **FIN-04B IN PROGRESS** — **04B-01 COMPLETE / APPROVED**; **04B-02 IMPLEMENTED / STAGE APPLIED**; **04B-03 IMPLEMENTED** |
| **Branch** | `cursor/sce-finance-04b-projection-engine` |
| **Base** | `STAGE` (post FIN-04A merge PR **#902**, merge `eb3901ae`) |
| **Implementation code** | Contract: `lib/finance/projection/projection-architecture-contract.ts`; persistence: `lib/finance/services/finance-projection-service.ts`; evidence: `lib/finance/services/finance-projection-evidence-service.ts` |

## Executive summary

FIN-04B introduces **SCE-generated financial projections**: system expectations derived from tenant evidence, distinct from the organisation-owned **current forecast** (FIN-04A), **approved budget**, **actuals**, and future **scenarios** (FIN-04D).

**Canonical principle (locked):**

> **SCE generates the projection. The organisation owns the forecast.**

This package defines domain boundaries, grains, evidence, data sufficiency, methodology abstraction, confidence, explainability, persistence/versioning, staleness, apply workflow, audit, permissions, and downstream compatibility — **without** implementing predictive algorithms, database migrations, or UI.

---

## 1. Product semantics

| Concept | Owner | Meaning |
| --- | --- | --- |
| **Approved budget** | Organisation (governance) | Immutable baseline once approved; projection/forecast never overwrite it. |
| **Actual** | Factual | What happened (`FinanceActualEntry`); independent from forecast and projection. |
| **SCE projection** | SCE (system) | Expectation from available evidence; may be absent or insufficient — never silently authoritative. |
| **Current forecast** | Organisation | Accepted management expectation (`FinanceForecast` current version); may be manual or explicitly adopted from projection. |
| **Scenario** | Organisation (what-if) | Alternative assumption set (FIN-04D); not projection, not current forecast. |

**German UI terminology (canonical):**

| Concept | Label |
| --- | --- |
| Workspace tab | **Prognose** (unchanged FIN-04A) |
| Organisation forecast | **Aktuelle Prognose** |
| System projection | **SCE-Projektion** |
| Explicit adoption | **SCE-Projektion übernehmen** |

Avoid parallel top-level tabs named “SCE-Prognose”, “Forecast”, and “Projection”. SCE assist lives **inside** the Prognose workspace.

---

## 2. Domain boundaries

- Projection logic lives in **`lib/finance/projection/`** (future services) — not inside forecast mutation paths.
- FIN-04A **`FinanceForecast*`** models remain organisation forecast persistence; **no** reuse of `scenarioKey` for SCE projection identity.
- Budget (`FinanceBudget*`), actuals (`FinanceActualEntry`), and projection snapshots (future) are separate write surfaces.
- Finance core stays **sport-, country-, and organisation-agnostic**; no sports-specific evidence kinds in core enums.

Architecture locks: `SCE_PROJECTION_ARCHITECTURE_LOCKS` in `projection-architecture-contract.ts`.

---

## 3. Projection lifecycle

```text
[Evidence available in tenant]
        ↓
User with manage permission triggers GENERATE / REFRESH (explicit)
        ↓
Engine evaluates data sufficiency per account (and aggregate)
        ↓
If insufficient → persisted or returned result with INSUFFICIENT + reasons (no fabricated amounts)
If sufficient/limited → versioned snapshot written (hybrid persistence)
        ↓
User reviews SCE-Projektion vs Aktuelle Prognose
        ↓
Optional: SCE-Projektion übernehmen → creates **new** organisation forecast version (audit trail)
        ↓
Later: new actuals / evidence → projection may become STALE (still visible for comparison)
```

Never:

```text
SCE projection → silent automatic mutation → current forecast
```

---

## 4. Projection vs forecast vs scenario

| | SCE projection | Current forecast | Scenario |
| --- | --- | --- | --- |
| **Source** | SCE calculation | Organisation | Organisation assumption |
| **Persistence (future)** | `FinanceProjection*` snapshot versions | `FinanceForecast*` (FIN-04A) | FIN-04D containers / `scenarioKey` hook |
| **Overwrite behaviour** | Does not overwrite forecast | Does not overwrite budget | Does not replace canonical current forecast unless explicitly promoted |
| **Reporting (FIN-05)** | Comparable column/measure | Primary management expectation | Optional what-if column |

---

## 5. Projection grain

### Published (management) grain

Aligns with FIN-04A:

- **`FinanceYear`** + **`FinancialAccount`** + **annual `amountMinor`**
- Currency from finance context (year/configuration — **no FX** in FIN-04B)
- `FORECAST_PHASING_SUPPORTED = false` extends to published projection — **no fake monthly forecast rows**

### Calculation grain

May be finer **internally**:

- Finance-year-relative **months** and **quarters** via FIN-03B `enumerateFinanceYearMonths` / `resolveFinanceMeasurementPeriod`
- Observations filtered by `FinanceActualEntry.effectiveDate` within year boundaries
- Roll-up to annual account projection for publication

**Rule:** Do not invent monthly management projection values solely because calculation used monthly buckets.

---

## 6. Data / evidence sources

Extensible **`ProjectionEvidenceKind`** (see contract):

| Kind | FIN-04B-01 availability | Notes |
| --- | --- | --- |
| `HISTORICAL_ACTUALS` | Yes (derive) | Prior `FinanceYear` entries per account |
| `CURRENT_YEAR_ACTUALS` | Yes | Entries in target year through cutoff |
| `BUDGET_BASELINE` | Yes | Approved baseline — reference only, not default “prediction” |
| `CURRENT_FORECAST` | Yes | Context/comparison only; not primary evidence |
| `KNOWN_COMMITMENTS` | Future FIN-07 | Adapter slot |
| `RECEIVABLES` | Future FIN-08 | Adapter slot |
| `RECURRING_PATTERNS` | Future | Derived feature |
| `OPERATIONAL_DRIVERS` | Future | Via driver provider boundary |
| `MANUAL_ASSUMPTIONS` | Future FIN-04D / inputs | Not scenario identity |

Progressive enablement: engine must run with **baseline evidence only**.

**Driver provider boundary:** `ProjectionDriverEvidenceProvider` — tenant-scoped `providerKey`, registered evidence kinds, no cross-tenant reads.

---

## 7. Historical actuals derivation

Source model: **`FinanceActualEntry`** (`effectiveDate`, `financeYearId`, `financialAccountId`, `amountMinor`, `currency`).

Derivation rules:

1. Resolve target **`FinanceYear`** `startDate` / `endDate` (tenant-defined — July–June, partial years, etc.).
2. **Current-year actuals:** entries where `financeYearId` matches and `effectiveDate` ≤ **`actualsThroughDate`** (cutoff).
3. **Historical actuals:** entries from **other** finance years for the same tenant + account (same currency semantics per entry).
4. Use FIN-03B period helpers when sub-year aggregation is needed; **never** assume calendar January–December.

Missing entries ≠ zero unless finance aggregation rules explicitly coalesce (prefer **null** / insufficient over fake zero).

---

## 8. Data sufficiency contract

**Level:** `SUFFICIENT` | `LIMITED` | `INSUFFICIENT`

**Reason codes (extensible):** e.g. `NO_ACTUAL_HISTORY`, `TOO_FEW_OBSERVATIONS`, `NO_CURRENT_YEAR_ACTUALS`, `SPARSE_ACCOUNT_HISTORY`, `UNSTABLE_HISTORY`, `UNSUPPORTED_DATA_PATTERN`, …

**Product rule:** If `INSUFFICIENT`, UI must be able to state *“Not enough data for a reliable SCE projection.”* — **no invented annual number**.

Detection rules may ship incrementally; the **contract is mandatory** from FIN-04B-02 onward.

**Data sufficiency ≠ model confidence** (see §9).

---

## 9. Methodology abstraction

**Families (product semantics):** `BASELINE_REFERENCE`, `RUN_RATE`, `HISTORICAL_PATTERN`, `SEASONAL_PATTERN`, `DRIVER_BASED`, `STATISTICAL`, `ENSEMBLE`, `NONE`

- Exposed to users as understandable methodology family — **not** Holt-Winters / Prophet / etc.
- Internal `methodologyVersion` / algorithm id may exist in provenance for engineering audit.

**Prohibited as default intelligence:** naive YTD annualisation (e.g. 3 months × 4) — may appear later only as an explicit **`RUN_RATE`** methodology with clear labeling, never as hidden “smart forecast”.

**Engine type:** numerical / statistical / driver-based — **LLM is not the canonical calculator** (`numericalEngineNotLlm`). LLM may later narrate structured provenance.

---

## 10. Confidence / uncertainty

**Confidence levels:** `HIGH` | `MEDIUM` | `LOW` | `NONE`

- **Sufficient data + volatile history** → may be `LIMITED` sufficiency + `LOW` confidence.
- Do **not** fabricate percentage confidence without methodology.

**Optional range:** `lowerBoundMinor`, `projectedAmountMinor`, `upperBoundMinor` — all nullable as a set; **absence is valid**. No fake ranges for UI padding.

---

## 11. Explainability / provenance

Structured **`SceProjectionExplainability`**:

- Evidence kinds considered
- Source cutoff (`actualsThroughDate`)
- Methodology family + version
- Data sufficiency + reasons
- Confidence + rationale codes
- Material influences (coded weights — not prose-only storage)

Supports future UI and optional AI summarisation **from facts**, not replacement of calculation.

---

## 12. Source cutoff

Every generation binds **`actualsThroughDate`** (inclusive UTC calendar day aligned with `effectiveDate` semantics).

- Stored on projection version snapshot.
- If actuals are later added/edited **after** that date, existing snapshot is **stale**, not retroactively rewritten.
- Audit question *“what did we know when this was generated?”* must be answerable.

---

## 13. Persistence / versioning decision

**Decision: `VERSIONED_SNAPSHOT_HYBRID` (option C)**

| Aspect | Choice |
| --- | --- |
| Read path | Serve **latest generated snapshot** for workspace (not full recompute on every page load) |
| Generate | Explicit **GENERATE / REFRESH** recalculates and creates **new projection version** |
| Audit | Historical versions remain addressable |
| Apply | Adoption record references **specific projection version id** |

**Rationale:** FIN-06-style publication discipline and governance require knowing **which** SCE output was accepted. Pure dynamic calculation on read loses cutoff and methodology provenance unless recomputed identically and logged — insufficient for “Apply SCE projection” traceability.

**FIN-04B-01:** schema **designed**, **not migrated**. Proposed future models (for review):

```text
FinanceProjection          — container per (tenantId, financeYearId), currentProjectionVersionId
FinanceProjectionVersion   — versionNumber, status CURRENT|SUPERSEDED, generatedAt, generatedByUserId?,
                             actualsThroughDate, methodologyFamily, engineVersion, sufficiency summary
FinanceProjectionLine      — (versionId, financialAccountId) projectedAmountMinor, currency,
                             sufficiency, confidence, range fields, structured provenance JSON
FinanceProjectionAdoption  — links projectionVersionId → forecastVersionId/forecastId, appliedAt, appliedByUserId
```

Exact column split (governance-critical vs extension JSON) to be finalised in FIN-04B-02 before migration.

---

## 14. Current projection pointer

**Yes:** mirror FIN-04A `currentVersionId` pattern — **`FinanceProjection.currentProjectionVersionId`**

- New generation supersedes prior **CURRENT** version (previous → `SUPERSEDED`).
- Historical versions remain for comparison and audit.
- Distinct from **`FinanceForecast.currentVersionId`** — two pointers, two lifecycles.

---

## 15. Staleness

**Workspace states:** `NO_PROJECTION_GENERATED` | `PROJECTION_AVAILABLE` | `PROJECTION_STALE` | `INSUFFICIENT_DATA` | `CALCULATION_FAILED`

**Stale triggers (semantic):** actual create/update/delete after cutoff; finance year boundary edit; account archive/restructure; driver evidence fingerprint change.

**First implementation:** compare stored cutoff + optional evidence fingerprint hash on read — mark `PROJECTION_STALE`, offer refresh. Stale ≠ deleted; user may compare *generated through X* vs newer data.

Event-driven invalidation may come later; semantics are defined now.

---

## 16. Projection → current forecast workflow

**UX (future FIN-04B-05+):** Inside Prognose, show side-by-side:

- SCE-Projektion total / per account
- Aktuelle Prognose
- Difference (signed, canonical money formatters)

**Apply:** single primary action **SCE-Projektion übernehmen**

**First implementation scope:** **whole `FinanceYear`** projection → materialise adopted values on a **new** `FinanceForecastVersion` (FIN-04A grain). Per-account apply deferred to canonical row/multi-select pattern.

**Apply must not:** change approved budget, actuals, or projection snapshot rows.

---

## 17. Forecast version impact (FIN-04A compatibility)

FIN-04A today: ordinary manual edits **mutate lines on the current forecast version** in place (unchanged by FIN-04B-02).

**FIN-04B adoption (future FIN-04B-06) — required contract (corrected FIN-04B-02):**

1. **`FinanceProjectionAdoption`** records: `projectionVersionId`, `sourceForecastVersionId`, `targetForecastVersionId`, `appliedByUserId`, `appliedAt`, scope.
2. Accepting an SCE projection is a meaningful change to organisation-owned current forecast → **create a new `FinanceForecastVersion`**, set it **CURRENT**, mark prior version **SUPERSEDED**, update `FinanceForecast.currentVersionId`.
3. Reconstructable trail: **forecast before → projection accepted → forecast after** without rewriting historical projection snapshots or inferring overwritten line state from audit metadata alone.
4. Generalising *all* forecast edits to version-on-every-save remains **FIN-04C / hardening** — not FIN-04B-02 scope.

**FIN-04B-02:** adoption table exists; apply workflow **not** implemented. FIN-04A forecast services unchanged.

---

## 18. Auditability

| Event | Minimum provenance |
| --- | --- |
| Generated | `generatedAt`, actor or SYSTEM, `actualsThroughDate`, methodology, engine version, evidence kinds |
| Applied | `appliedAt`, `appliedByUserId`, `projectionVersionId`, target forecast version id |
| Insufficient | sufficiency reasons stored — no amount |

Tenant isolation on all rows (`tenantId` on containers).

---

## 19. Permissions & capability

**Capability:** **`FORECASTING`** (unchanged — projection is Prognose assist)

| Action | Permission |
| --- | --- |
| View projection | `finance.forecast.view` |
| Generate / refresh | `finance.forecast.manage` (or `finance.admin`) |
| Apply to current forecast | `finance.forecast.manage` |

Separate **authorization actions** in code even when permission keys overlap — avoids permission explosion.

No new capability solely for FIN-04B.

---

## 20. Account lifecycle edge cases

| Case | Projection behaviour |
| --- | --- |
| ACTIVE + history | Normal calculation path |
| ARCHIVED | Exclude from **new** generation by default; historical actuals may inform other accounts |
| New account, no history | `INSUFFICIENT` / `NO_ACTUAL_HISTORY` unless other evidence explicitly supports methodology |
| History but no current-year actual | `LIMITED` or `INSUFFICIENT` depending on methodology |
| Budget but no actual | Budget **reference only** — not auto-presented as SCE projection |
| Actual but no budget | Allowed — projection does **not** require budget line |

Negative amounts: follow **`FinanceActualEntry`** / account semantic rules (expense/income sign conventions) — projection output uses same canonical result aggregation as FIN-03.

**Missing vs zero:** treat missing observations as absent, not zero, unless explicit aggregation policy applies.

---

## 21. FIN-04C / FIN-04D / FIN-05 / FIN-06 / FIN-11 compatibility

| Programme | Compatibility |
| --- | --- |
| **FIN-04C** Rolling forecast | Versioned projection cycles; repeated generate/refresh; no one-shot identity; adoption may eventually create new forecast versions |
| **FIN-04D** Scenarios | `scenarioKey` on forecast remains scenario hook; projection uses separate persistence |
| **FIN-05** Reporting | Measures: Budget, Actual, Current Forecast, SCE Projection (optional column) — distinct semantics |
| **FIN-06** Publishing | Published snapshots frozen; live projection changes do not silently alter published reports |
| **FIN-11** Balance sheet | No ASSET/LIABILITY/EXPENSE expansion in FIN-04B; projection lines remain on existing INCOME/EXPENSE accounts |

---

## 22. Initial implementation decomposition

Derived minimal sequence (names indicative):

| Step | Package | Deliverable |
| --- | --- | --- |
| 1 | **FIN-04B-02** | **DONE (code)** — migration `20261023200000_sce_finance_04b_02_projection_persistence` + lifecycle services (generate stub, persist snapshot); STAGE apply pending |
| 2 | **FIN-04B-03** | Evidence extraction (historical/current actuals, year boundaries), sufficiency evaluator (baseline rules) |
| 3 | **FIN-04B-04** | First methodology plug-in (explicit, labeled — not naive default annualisation) behind methodology registry |
| 4 | **FIN-04B-05** | Prognose workspace UX — states, stale, insufficient, comparison strip |
| 5 | **FIN-04B-06** | Apply workflow + forecast adoption provenance |
| 6 | **FIN-04B-07** | Confidence/range hardening, explainability surfacing, driver provider registration API |

FIN-04B-01 **stops here** — architecture + contract + governance tests only.

---

## 23. Architecture tests

`lib/finance/__tests__/finance-04b-projection-architecture.test.ts` guards:

- Projection ≠ forecast ≠ scenario
- No silent overwrite contracts
- No LLM in numerical contract module
- Tenant FinanceYear + no CHF hardcoding
- FIN-04B-02 projection persistence models present; immutability guards
- FIN-04A forecast models intact
- Published grain / no phasing

---

## 24. References

- [`SCE-FINANCE-04A-IMPLEMENTATION.md`](./SCE-FINANCE-04A-IMPLEMENTATION.md)
- [`SCE-FINANCE-03A-IMPLEMENTATION.md`](./SCE-FINANCE-03A-IMPLEMENTATION.md) — actual grain
- [`SCE-FINANCE-03B-IMPLEMENTATION.md`](./SCE-FINANCE-03B-IMPLEMENTATION.md) — period resolver
- ADR-021, **ADR-034** (FIN-04B projection engine)
- Code: `lib/finance/projection/projection-architecture-contract.ts`

---

## Binary control (FIN-04B-01)

No UI in this package.

```text
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = N/A (no new UI)
SINGLE_CHOICE_PATTERN = N/A
MULTI_SELECTION_PATTERN = N/A (future apply scope: row/multi-select if per-account)
```
