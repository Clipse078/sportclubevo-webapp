# SCE-FINANCE-04C — Rolling Forecast & Reforecasting Architecture

| Field | Value |
| --- | --- |
| **Package** | FIN-04C programme — **04C-01** architecture; **04C-02** persistence; **04C-03+** service/UX |
| **Status** | **04C-01 COMPLETE** · **04C-02 COMPLETE** · **04C-03 COMPLETE** · **04C-04 COMPLETE** · **04C-05 COMPLETE** · **04C-06 NEXT** |
| **Branch** | `cursor/sce-finance-04c-rolling-forecast` |
| **Base** | `STAGE` (post FIN-04B merge PR **#903**, merge `f6bd28c5`) |
| **Implementation code (04C-01)** | `lib/finance/forecast/rolling-forecast-architecture-contract.ts`, `forecast-revision-comparison.ts` |

## Executive summary

FIN-04C defines how an organisation **repeatedly reassesses its expected financial year-end position** as the year progresses — the controlled **management process** around forecast updates.

**Question FIN-04C answers:**

> What do we currently expect the financial year to end at, given everything we know today?

FIN-04C builds on **Approved Budget**, **Actual**, **Automatische Prognose**, and **Aktuelle Prognose** (FIN-02 / FIN-03 / FIN-04A / FIN-04B). It introduces **formal reforecast checkpoints** without turning every field edit into meaningless version inflation.

**Principles (locked):**

1. *SCE generates the projection. The organisation owns the forecast.* (FIN-04B)
2. *The current forecast is a living management view. Formal reforecasts create governance history.* (FIN-04C)

Code locks: `SCE_ROLLING_FORECAST_ARCHITECTURE_LOCKS` in `rolling-forecast-architecture-contract.ts`.

---

## 1. Terminology

| Concept | Meaning | Persistence (today / planned) |
| --- | --- | --- |
| **Approved budget** | Governance baseline — what was approved; does not move during ordinary reforecasting | `FinanceBudget*` baseline |
| **Actual** | What happened | `FinanceActualEntry` |
| **Automatische Prognose** | System-generated expectation; immutable versioned snapshots; explicit refresh | `FinanceProjection*` |
| **Aktuelle Prognose** | Organisation-owned current management expectation | `FinanceForecast.currentVersionId` → `FinanceForecastVersion` (CURRENT) |
| **Reforecast / forecast revision** | Formal management update preserved as meaningful history | New `FinanceForecastVersion` + prior → SUPERSEDED (FIN-04C-02+) |
| **Scenario** | Alternative hypothetical future (FIN-04D) | `scenarioKey` on forecast version — **not** ordinary reforecast |

### German product terminology (FIN-04C)

| Action / surface | Label | Must not collide with |
| --- | --- | --- |
| Regenerate SCE projection | **Automatische Prognose aktualisieren** | — |
| Adopt projection into forecast | **Automatische Prognose übernehmen** | — |
| Formal organisation reforecast | **Neue Prognose festhalten** | Automatic refresh wording |
| History inside Prognose | **Prognoseverlauf** | Separate top-level Finance tab |
| Version metadata (secondary) | **Version n** | Primary user mental model |

Evaluated alternatives for formal reforecast: *Prognose revisionieren* (jargon), *Neue Prognose erstellen* (ambiguous with first forecast), *Prognosestand festhalten* (acceptable but longer). **Neue Prognose festhalten** best matches club finance language: preserve today’s management expectation as an official checkpoint.

---

## 2. What is a forecast version?

FIN-04B already introduced `FinanceForecastVersion`. FIN-04C defines long-term semantics:

| Lifecycle concept | Meaning |
| --- | --- |
| **Working current forecast** | The editable management expectation — `FinanceForecastVersion` with status **CURRENT** |
| **Formal forecast revision** | A meaningful checkpoint when management explicitly establishes a revised expectation |
| **Historical forecast version** | Immutable prior formal expectation (`SUPERSEDED`) for comparison and audit |

**Not every manual edit creates a formal version.** Insignificant keystrokes must not produce Version 1, 2, 3, … noise.

**FIN-04B adoption remains valid:** **Automatische Prognose übernehmen** is itself a meaningful revision (organisation explicitly accepts a new expectation) and **may** create a formal `FinanceForecastVersion` — PO UAT passed behaviour is preserved.

---

## 3. Working vs formal forecast — canonical decision

Evaluated options:

| Option | Summary | Outcome |
| --- | --- | --- |
| **A** | CURRENT version mutable until formally superseded | **Chosen (evolved)** |
| **B** | Explicit DRAFT + immutable formal CURRENT | Rejected — conflicts with FIN-04A living current; dual “current” confusion |
| **C** | Separate working lines vs snapshot lines | Rejected — migration cost, UX complexity, weak FIN-04B compatibility |

**Canonical approach: mutable CURRENT with immutable SUPERSEDED checkpoints**

- Manual line edits (`upsertForecastLine`) mutate the **CURRENT** version in place (FIN-04A behaviour unchanged).
- **Neue Prognose festhalten** (and FIN-04B adoption) atomically: supersede prior CURRENT (immutable history), create new CURRENT seeded from prior lines, attach revision metadata to the **promoted CURRENT** snapshot (FIN-04C-02).
- No **DRAFT** status — only **CURRENT** and **SUPERSEDED** (`FinanceForecastVersionStatus`).

State machine:

```text
(initial) ──create forecast──► CURRENT
CURRENT ──formal reforecast / adoption──► SUPERSEDED  (+ new CURRENT in same transaction)
SUPERSEDED ──any mutation──► forbidden
```

---

## 4. Reforecast cycle (conceptual)

```text
Approved Budget
       ↓
Current Forecast (living)
       ↓
Actual data evolves
       ↓
Automatic Forecast may change (independent)
       ↓
Management reviews
       ↓
Current Forecast adjusted (in-place edits)
       ↓
Formal reforecast / adoption
       ↓
Historical snapshot retained (SUPERSEDED)
       ↓
New CURRENT becomes management reference
```

Example within one finance year:

| Checkpoint | Income expectation |
| --- | --- |
| Budget approved | 150'000 |
| January current forecast | 150'000 |
| April reforecast (formal) | 158'000 |
| July reforecast | 165'000 |
| October reforecast | 172'000 |
| Final actual | 169'500 |

SCE must later explain: Budget → April → July → October → Actual (FIN-05).

**No fixed cadence** — monthly, quarterly, ad hoc, or twice per year are all supported without schema special cases.

---

## 5. Forecast revision identity (FIN-04C-02 persistence)

Minimum durable metadata (planned extension to `FinanceForecastVersion`):

| Field | Purpose |
| --- | --- |
| Stable container | `FinanceForecast` per tenant + `financeYearId` |
| Immutable version ID | `FinanceForecastVersion.id` |
| Version number | Monotonic `versionNumber` (secondary UX) |
| `financeYearId` | Via container |
| `createdAt` / `createdByUserId` | Audit |
| **`asOfDate`** | Datenstand — information available when expectation established |
| **`actualsThroughDate`** | Actuals known through date at revision |
| Optional **`revisionLabel`** | e.g. “Q3 Review” |
| Optional **`note`** | Existing field — lightweight context |
| **`revisionSource`** | e.g. `INITIAL_FORECAST`, `MANUAL_REFORECAST`, `AUTOMATIC_FORECAST_ADOPTION` |
| **`sourceProjectionVersionId`** | When adoption contributed |
| **`previousVersionId`** | Chain for history |
| **`status`** | CURRENT / SUPERSEDED |

Do not over-model approval workflow in FIN-04C.

---

## 6. Cutoff / as-of date

**`asOfDate` (Datenstand)** answers: *What information was available when this forecast was established?*

Distinct from:

- `createdAt` — when the record was written
- `updatedAt` — last line edit on working CURRENT

Example: forecast formalized on 5 October may represent Datenstand 30 September.

Month-end not required. Dates must respect tenant **`FinanceYear`** boundaries.

---

## 7. Actuals through date

Align with FIN-03B / FIN-04B temporal actual semantics.

A formal reforecast stores (or resolves at creation time) **`actualsThroughDate`** so historical comparison can distinguish:

- actual known **at that revision**, vs
- remainder still forecast.

**Do not fabricate** historical “known actual” from today’s ledger if cutoff cannot reconstruct truthfully. Prefer explicit stored cutoff metadata plus actual history queries (FIN-04C-04).

---

## 8. Reforecast composition

At cutoff, full-year management expectation conceptually:

```text
FULL-YEAR FORECAST = KNOWN ACTUAL THROUGH CUTOFF + EXPECTED REMAINDER
```

**`FinanceForecastLine`** remains **annual `amountMinor`** per account — do **not** split every line into actual/remainder columns unless a durable reporting need appears. Reconstruct composition via cutoff metadata + actual history where needed.

---

## 9. Comparison semantics

Neutral revision delta (domain layer):

```text
rawRevisionDelta = newForecast − previousForecast
```

Income +10'000 and expense +10'000 both yield +10'000 delta; **favorability** stays in presentation (see `forecast-budget-comparison.ts` pattern).

Supported future pairs: current vs budget, current vs previous formal revision, current vs automatic forecast, previous vs budget, actual vs historical forecast.

Implementation: `computeForecastRevisionComparisonMetrics` in `forecast-revision-comparison.ts`.

---

## 10. Revision context (optional)

Lightweight, optional:

- `revisionLabel` — “Nach Mitgliederabrechnung”, “Q3 Review”
- `note` — short free text
- `revisionSource` — structured provenance

No enterprise approval workflow. No AI-generated reasons.

---

## 11. Automatic forecast relationship

| Rule | Locked |
| --- | --- |
| Current forecast revision may be manual, adoption-based, or manual after adoption | Yes |
| `FinanceProjectionAdoption` provenance preserved | Yes |
| Manual revision need not cite projection source | Yes |
| Refreshing automatic forecast **does not** create current forecast revision | Yes |
| Editing current forecast **does not** mark automatic forecast stale | Yes |

Staleness remains evidence-based (FIN-04B).

---

## 12. Forecast history UX (architecture only — not built in 04C-01)

Inside **Prognose → Aktuelle Prognose**:

- Primary action: **Neue Prognose festhalten**
- **Prognoseverlauf** list: date + label + “Aktuell” on working version
- Compare version pairs (when / why / what changed) — version number secondary

No new top-level Finance tab for history.

---

## 13. Forecast accuracy (prepare only)

Future FIN-05 question: *How accurate was the July forecast vs final actual?*

Architecture must allow per-revision cutoff + immutable lines + final actual — **not implemented** in 04C-01.

---

## 14. FIN-04D scenario boundary

| Reforecast | Scenario |
| --- | --- |
| What we **now expect** | What **could** happen if… |
| No `scenarioKey` on ordinary revisions | `scenarioKey` identifies what-if |
| Enters formal history on **Neue Prognose festhalten** | Does not pollute history until explicit promotion (FIN-04D) |

Guard: `ROLLING_FORECAST_SCENARIO_BOUNDARY` in contract.

---

## 15. FIN-05 / FIN-06 compatibility

- FIN-05: budget, actual, current forecast, historical forecasts, deltas, accuracy
- FIN-06: published reports reference **stable version IDs**; historical values must not change when current is edited

Formal **SUPERSEDED** revisions are immutable snapshots.

---

## 16. Permissions

Reuse FIN-04A/04B:

| Permission | FIN-04C scope |
| --- | --- |
| `finance.forecast.view` | Current forecast, history, comparisons |
| `finance.forecast.manage` | Edit current, formal reforecast, adoption (existing) |

No new permission keys in 04C-01.

---

## 17. Tenant / country / sport agnostic

No hardcoded CHF, Switzerland, football, season cadence, or calendar-year assumptions. **`FinanceYear`** and currency remain tenant-configured.

---

## 18. Data model evolution (recommendation — migration in 04C-02)

| Model | Action | Notes |
| --- | --- | --- |
| `FinanceForecast` | **KEEP** | `currentVersionId` canonical pointer |
| `FinanceForecastVersion` | **EXTEND** | `asOfDate`, `actualsThroughDate`, `revisionSource`, `revisionLabel`, `previousVersionId`, `sourceProjectionVersionId`; keep `scenarioKey` for FIN-04D only |
| `FinanceForecastLine` | **KEEP** | Annual grain |
| `FinanceProjectionAdoption` | **KEEP** | Adoption provenance |

---

## 19. Concurrency

- Formal reforecast requires **expected current version id** (optimistic concurrency — same pattern as FIN-04B adoption).
- Stale editors must refresh; never silently overwrite a newer management expectation.
- Adoption vs reforecast dialog races resolved via pointer + expected ids.

---

## 20. Deletion policy

Formal historical revisions are **not** ordinarily deleted via management UX. Corrections → new formal revision.

---

## 21. Legacy FIN-04A / FIN-04B compatibility

Existing forecasts remain valid. Example: Version 1 SUPERSEDED, Version 2 CURRENT — interpretable after FIN-04C.

Missing FIN-04C metadata on legacy versions:

- Do **not** invent false cutoff dates or labels
- Display may fall back to `createdAt` date with “legacy” semantics
- Missing `revisionSource` → legacy unknown
- FIN-04B adoptions remain traceable via `FinanceProjectionAdoption`

---

## 22. Implementation decomposition

| Step | Package | Deliverable |
| --- | --- | --- |
| 1 | **FIN-04C-01** | Architecture contract, tests, documentation (**COMPLETE**) |
| 2 | **FIN-04C-02** | Persistence & revision lifecycle (**COMPLETE**) |
| 3 | **FIN-04C-03** | Formal reforecast service (**COMPLETE** — [`SCE-FINANCE-04C-03-FORMAL-REFORECAST.md`](./SCE-FINANCE-04C-03-FORMAL-REFORECAST.md)) |
| 4 | **FIN-04C-04** | Forecast history & comparison query layer (**COMPLETE** — [`SCE-FINANCE-04C-04-HISTORY-COMPARISON.md`](./SCE-FINANCE-04C-04-HISTORY-COMPARISON.md)) |
| 5 | **FIN-04C-05** | Rolling forecast workspace UX (**NEXT**) |
| 6 | **FIN-04C-06** | Reforecast context / reason / cutoff UX |
| 7 | **FIN-04C-07** | Hardening, concurrency & release closure |

---

## 23. Architecture tests

`lib/finance/__tests__/finance-04c-rolling-forecast-architecture.test.ts` guards:

- Reforecast ≠ scenario; automatic forecast ≠ current forecast
- Manual edit ≠ automatic formal revision
- Formal reforecast / adoption create history conceptually
- `currentVersionId` canonical; SUPERSEDED immutable
- Tenant FinanceYear; no fixed cadence
- As-of distinct from createdAt
- FIN-04B adoption revision source
- No fake phasing; no LLM numerical forecasting
- FIN-05/06 stable references; FIN-04A/B models recognized

---

## 24. Explicit out of scope (04C-01)

- DB migration, server mutations, history panel, revision dialog, comparison charts, reforecast CTA
- FIN-04C-03 through 04C-07 implementation
- Forecast accuracy analytics
- Scenario workflow (FIN-04D)
- Enterprise approval workflow
- STAGE / production data mutation

---

## 25. References

- [`SCE-FINANCE-04A-IMPLEMENTATION.md`](./SCE-FINANCE-04A-IMPLEMENTATION.md)
- [`SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md`](./SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md)
- [`SCE-FINANCE-04B-06-PROJECTION-ADOPTION.md`](./SCE-FINANCE-04B-06-PROJECTION-ADOPTION.md)
- ADR-034, **ADR-035** (rolling forecast)
- Code: `lib/finance/forecast/rolling-forecast-architecture-contract.ts`

---

## Binary control (FIN-04C-01)

```text
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = existing Finance capability / permission gates only
MULTI_SELECTION_PATTERN = unchanged (reserved for future scope patterns)
```
