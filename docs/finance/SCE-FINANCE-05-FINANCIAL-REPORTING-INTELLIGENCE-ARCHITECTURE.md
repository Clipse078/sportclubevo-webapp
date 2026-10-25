# SCE-FINANCE-05 — Financial Reporting & Intelligence Architecture

| Field | Value |
| --- | --- |
| **Programme** | FIN-05 — Financial Reporting & Intelligence |
| **Package** | **FIN-05A** — architecture, information design, domain contract |
| **Status** | **FIN-05A–05G COMPLETE** (05G PO UAT PASS — PR **#914** → **STAGE** — [`SCE-FINANCE-05G-REPORTING-VISUAL-INTELLIGENCE-RESPONSIVE-HARDENING.md`](./SCE-FINANCE-05G-REPORTING-VISUAL-INTELLIGENCE-RESPONSIVE-HARDENING.md)); **FIN-05H NEXT / NOT STARTED** |
| **Branch** | FIN-05E: `cursor/sce-finance-05e-reporting-workspace-drilldown-5fa5` — see [`SCE-FINANCE-05E-REPORTING-WORKSPACE-DRILLDOWN.md`](./SCE-FINANCE-05E-REPORTING-WORKSPACE-DRILLDOWN.md) |
| **Base** | `STAGE` after FIN-04E merge (PR **#907**, merge commit `c1450ef7ce5849705c4f9e4ace248e1996d45a4a`) |
| **Code locks** | `lib/finance/reporting/finance-reporting-intelligence-architecture-contract.ts` |
| **ADR** | [ADR-038 — Financial Reporting & Intelligence (FIN-05)](../roadmap/05-architecture-decisions.md#adr-038--financial-reporting--intelligence-fin-05) |

## Executive summary

FIN-05 turns canonical Finance inputs into **understandable management information**. It **interprets** approved budget, actual, current forecast, automatic forecast, expected financial timing, and scenarios — it does **not** silently become the source of truth for those measures.

**FIN-05A is architecture only:** no full reporting UI, no Übersicht redesign, no statutory accounting, no liquidity, no publication/sharing (FIN-06), no fake monthly phasing, and no reopening of FIN-04E product decisions.

---

## 1. Product principle

```text
COMPLEXITY SHOULD EXIST IN THE SYSTEM, NOT IN THE USER'S HEAD.
```

Reporting must embody:

```text
SIMPLE UNDERSTANDING.
SHALLOW NAVIGATION.
DEEP CAPABILITY.
```

Default experiences progressively answer:

1. **What is happening?**
2. **Is it good or bad / on track or off track?**
3. **What requires attention?**
4. **Why?**
5. **Where can I investigate it?**

### Information hierarchy

```text
INTERPRETATION → EXCEPTION → EXPLANATION → EVIDENCE
```

Equivalent compression:

```text
CONCLUSION → WHY → DETAIL
```

### Comprehension tests

| Test | Expectation |
| --- | --- |
| **10-second comprehension** | A club board member understands the important financial situation in ~10 seconds |
| **30-second investigation** | User identifies the main reason for a meaningful variance and reaches supporting detail in ~30 seconds |
| **No mental arithmetic** | SCE calculates and explains differences — users must not manually compare several numbers |

Reporting must **not** default to a wall of KPIs, charts, ratios, tables, filters, accounting jargon, and configuration merely because they are technically available.

---

## 2. FIN-05 responsibility

**FIN-05 = Financial Reporting & Intelligence**

| Canonical input | Role |
| --- | --- |
| **Approved Budget** | Governance baseline (FIN-02) |
| **Actual** | Recorded financial reality (FIN-03B) |
| **Current Forecast / Aktuelle Prognose** | Organisation-owned current expectation (FIN-04A / FIN-04C) |
| **Automatic Forecast / Automatische Prognose** | System-generated projection where applicable (FIN-04B) |
| **Expected Financial Events** | Temporal expectation evidence (FIN-04E) |
| **Scenarios** | Hypothetical alternatives (FIN-04D) |

FIN-05 **consumes and interprets** these sources. It **must not** redefine or mutate them from reporting surfaces.

**Lock:** `REPORTING_IS_NOT_SOURCE_OF_TRUTH`

---

## 3. Workspace responsibility model

| Workspace (DE) | Verb | Primary question |
| --- | --- | --- |
| **Übersicht** | **UNDERSTAND** | Where do we stand; what needs attention? |
| **Budget** | **PLAN / GOVERN** | What did we approve; how do we plan? |
| **Ist** | **RECORD / MEASURE** | What happened? |
| **Prognose** | **EXPECT / REFORECAST** | What do we expect now; what if? |
| **Zeitplanung** | **MANAGE EXPECTED TIMING EVIDENCE** | When do we expect movements (evidence maintenance)? |
| **Reporting** | **ANALYSE / EXPLAIN / PRESENT** | Why are we here; what explains the result? |
| **Einrichtung** | **CONFIGURE** | Structure, capabilities, setup |

Avoid duplicating the same analytical experience across several pages.

### FIN-04E lock preserved

The **large expected-financial-movement visualization** does **not** belong on **Zeitplanung** (management/input workspace). **Finance Übersicht** is the intended **interpretive** consumer; **Reporting** owns deeper analysis. R4 movement chart capability remains in code for **reuse when a decision question warrants it** — not automatic mounting.

---

## 4. Übersicht vs Reporting

| Surface | Role | Must not become |
| --- | --- | --- |
| **Finance Übersicht** | Selective interpretive summary; attention routing; small number of drivers | Dashboard of every financial chart |
| **Reporting** | Analytical investigation; account/structure variance; comparative intelligence | Duplicate full overview or Zeitplanung maintenance UX |

### Drill-through patterns

```text
Übersicht → Reporting → Account / Cost Center / Dimension evidence
Übersicht → Prognose → (context)
Übersicht → Zeitplanung → (maintenance — not primary analysis)
```

**Locks:** `OVERVIEW_IS_INTERPRETIVE`, `REPORTING_IS_ANALYTICAL`, `ZEITPLANUNG_IS_MANAGEMENT_WORKSPACE`

---

## 5. Canonical management measures

Definitions live in code: `FINANCE_REPORTING_CANONICAL_MEASURES`. Each measure documents **source**, **grain**, **sign semantics**, **comparison role**, **missing-data behavior**, **currency**, **period**, and **aggregation validity**.

| Measure | Summary |
| --- | --- |
| **Approved Budget** | Approved `FinanceBudgetVersion` lines — never draft substitution |
| **Actual** | FIN-03B truth — partial history allowed with scoped conclusions |
| **Current Forecast** | `FinanceForecast.currentVersionId` annual lines |
| **Automatic Forecast** | FIN-04B projection — reference, not silent forecast replacement |
| **Variance (Actual vs Budget)** | Central semantics: `computeAccountVarianceMetrics` (FIN-03A) — extend in FIN-05B |
| **Forecast variance (Current Forecast vs Approved Budget)** | Forecast gap vs governance baseline |
| **Actual vs Forecast** | Only with explicit period semantics — no implicit annualisation |
| **Remaining expectation** | Full-year forecast minus realized actual where period rules valid |
| **Expected financial timing coverage** | FIN-04E reconciliation — **not** budget phasing |
| **Income / Expense / Management Result** | Hierarchy rollups; **RESULT = INCOME − EXPENSE** |

Avoid false precision. Integer minor units for arithmetic (`INTEGER_MINOR_UNITS`).

---

## 6. Management P&L / Erfolgsrechnung

FIN-05 includes architecture for a **management-oriented** income statement over the existing **INCOME / EXPENSE** reporting hierarchy (FIN-01C / FIN-01E).

Example **illustrative** layout only ( **do not hardcode** ):

```text
Income → … → Total Income
Expenses → … → Total Expenses
Management Result
```

**Locked principle:**

```text
SCE PROVIDES THE FINANCIAL ENGINE.
THE ORGANISATION BUILDS ITS FINANCIAL STRUCTURE.
```

Works for Swiss football clubs, Dutch hockey, German multisport, UK swimming, US youth basketball, tennis, federations, camp/event organisations — **no sport-specific reporting schema**.

**Lock:** `MANAGEMENT_PNL_IS_NOT_STATUTORY_ACCOUNTING`, `CONFIGURABLE_ORGANISATIONAL_SEMANTICS`

---

## 7. FIN-11 boundary

FIN-05 does **not** provide statutory accounting. Deferred to **FIN-11** (or country packs):

- Asset / Liability / Equity recognition
- Double-entry bookkeeping, journal entries, general ledger
- Balance sheet, statutory chart of accounts
- Country-specific rules, tax, VAT

Management P&L operates on the **operating INCOME/EXPENSE model** only.

**Locks:** `NO_ASSET_LIABILITY_EQUITY_IN_FIN_05`, `BALANCE_SHEET_DEFERRED_TO_FIN_11`

---

## 8. Variance intelligence

Canonical model: `FINANCE_VARIANCE_INTELLIGENCE_MODEL`.

| Concept | Rule |
| --- | --- |
| **Absolute variance** | Documented per comparison pair |
| **Percentage variance** | `null` when baseline zero, missing, or unsupported |
| **Favourable / unfavourable** | From **canonicalSemantic** — income above budget may be favourable; expense above budget may be unfavourable |
| **Material / non-material** | Prioritisation only — **never hides evidence** |

**Critical:** `VARIANCE_DIRECTION_IS_SEMANTIC` — central implementation (extend FIN-03A), **no scattered sign inversion in React**, **no double inversion**.

---

## 9. Materiality

Materiality helps users focus on what matters. FIN-05A defines **contract + default-safe behavior** only:

- Default: relative ranking when no org policy exists
- Future: absolute / percent / combined / configurable thresholds
- **No** universal hardcoded CHF threshold in architecture
- **No** configuration UI in FIN-05A

---

## 10. Period intelligence

`FINANCE_REPORTING_PERIOD_SEMANTICS`

| View | Valid when |
| --- | --- |
| Finance year | Always (tenant-defined boundaries) |
| Year to date / period to date | Actual resolver + cutoff metadata exist |
| Month / quarter trend | **Genuine** time-series evidence exists |

### Invalid (locked)

- Monthly budget from annual ÷ 12 without phasing evidence
- Monthly forecast trend from annual ÷ 12
- Expected timing treated as budget phasing or accounting recognition

**Lock:** `NO_FAKE_MONTHLY_PHASING` (aligns with `FORECAST_PHASING_SUPPORTED === false`)

---

## 11. Visual intelligence architecture

Every visualization must answer a **decision question** — not populate a chart gallery.

| Family | Decision question | Notes |
| --- | --- | --- |
| **Budget / Actual / Forecast comparison** | Where are we expected to finish vs approved plan? | Bullet, variance bar, grouped comparison |
| **Income / Expense composition** | What drives the result? | Ranked bars, hierarchy; avoid default pie/donut proliferation |
| **Variance contribution** | Which accounts explain the difference? | Diverging bars, waterfall when valid |
| **Financial movements over time** | When are movements expected? | **Discrete event timeline** on Übersicht (FIN-05D/05G) — stems/intervals, **not** a connected line graph |
| **Trend** | How did measures evolve? | Only with real time buckets |
| **Forecast evolution** | How did expectation change between versions? | FIN-04C history — **FIN-05F** |
| **Liquidity** | Cash runway / treasury | **FIN-09 — NOT FIN-05** |

**Lock:** `NO_LIQUIDITY_IN_FIN_05`, `DECISION_FIRST`

### Visual form selection (locked)

| Question type | Canonical visual form |
| --- | --- |
| Continuous value over time (e.g. projected cash balance) | Line / subtle area — **FIN-09 only** when authoritative liquidity semantics exist |
| Discrete financial events over time | **Event timeline** (Overview FIN-05G) |
| Category magnitude | Bar / table hierarchy |
| Variance drivers | Ranked comparison / direct list (attention drivers) |

**FIN-05G boundary:** Overview **expected financial movements** remain a discrete event timeline. Do **not** connect events with a line to imply running balance or liquidity. Opening cash/bank balance + dated inflows/outflows + `projected cash balance(t)` belong to **FIN-09**, not reporting visual hardening.

Annual budget or current forecast must **not** be ÷12 or otherwise phased to fabricate liquidity. Expected events without cash timing evidence must not be silently treated as precisely timed liquidity. Accounting recognition ≠ cash timing.

---

## 12. Overview visual intelligence (direction)

Restrained **decision-oriented narrative** for Finance Übersicht (implementation **FIN-05D**):

1. Financial position / expected result (budget, actual context, forecast, forecast variance)
2. What needs attention (material variances, forecast risks, timing exceptions)
3. Key drivers (small set of largest contributors)
4. Expected movements — **only if** timing evidence is meaningful
5. Drill-down routes (Reporting, Budget, Forecast, Zeitplanung)

Evaluate existing Übersicht before locking layout. Prefer **one coherent narrative** over card soup.

---

## 13. Explainability

For every significant conclusion:

```text
CONCLUSION → CONTRIBUTING FACTORS → SOURCE EVIDENCE
```

Core numerical explanation is **deterministic**. Future AI may phrase evidence in natural language but **must not invent calculations**.

---

## 14. Dimensional analysis

Optional Finance dimensions (OrgUnit, Team/Group, Person, Activity, Event, Project, Facility, Fund, Funding Source, Cost Center, custom). **Team not required.**

Progressive disclosure: filtering, grouping, drill-down — **not** a generic BI filter builder.

**Lock:** `TEAM_NOT_REQUIRED`

---

## 15. Report snapshot / publication boundary

```text
FINANCIAL DATA ≠ REPORTS ≠ SHARES ≠ PUBLICATIONS
```

| Mode | Behavior |
| --- | --- |
| **Live reporting view** | `mode: LIVE` (FIN-01E) — changes with source data |
| **Published report snapshot** | Versioned, auditable, stable — **FIN-06** |

**Lock:** `PUBLICATION_DEFERRED_TO_FIN_06`

---

## 16. Permissions

Reuse canonical Finance permissions:

- Primary: `finance.view` (Reporting nav today)
- Measure-scoped: `finance.budget.view`, `finance.actual.view`, `finance.forecast.view`
- Configure: `finance.structure.manage` — **not** implied by view
- Share / publish: **FIN-06** — **not** implied by view

Optional future: `finance.reporting.view` only if `finance.view` proves insufficient.

---

## 17. Read model architecture

Reporting pages must **not** reconstruct the full Finance domain in React.

- Prefer presentation-neutral **server read models**
- Existing: `FinancialReportingReadModel` (FIN-01E — Approved Budget)
- Proposed: `FinanceManagementOverviewReadModel`, `FinanceManagementPnlReadModel`, `FinanceVarianceAnalysisReadModel`, `FinanceReportingDrilldownReadModel`, `FinanceComparativeMeasuresReadModel`

Align with **SCE-SCALE-01**: expensive work once, serve many times — **no speculative cache infrastructure in FIN-05A**.

Avoid N+1, unbounded reads, per-row server calls, client-side re-aggregation.

---

## 18. Currency / locale

Separate:

- **Currency identity**
- **Formatting locale**
- **Translation locale**

No hardcoded CHF or de-CH. No country inference from currency. Same-currency aggregation only in FIN-05 scope.

**Lock:** `NO_HARDCODED_CURRENCY`

---

## 19. Responsive / accessibility

- Mobile: interpretation first, exceptions second, detail progressively disclosed
- Charts require textual / accessible interpretation
- Color never sole indicator for favourable/unfavourable/risk/status

---

## 20. Error / incomplete data states

`FINANCE_REPORTING_INCOMPLETE_DATA_BEHAVIOR` — communicate what can and cannot be concluded. Do **not** fabricate conclusions for missing budget, actual, forecast, hierarchy, dimensions, timing, or zero baseline.

---

## 21. Architecture locks (machine-testable)

| Lock | Contract field |
| --- | --- |
| REPORTING_IS_NOT_SOURCE_OF_TRUTH | `reportingIsNotSourceOfTruth` |
| APPROVED_BUDGET_REMAINS_GOVERNANCE_BASELINE | `approvedBudgetRemainsGovernanceBaseline` |
| CURRENT_FORECAST_REMAINS_ORGANISATION_EXPECTATION | `currentForecastRemainsOrganisationExpectation` |
| NO_FAKE_MONTHLY_PHASING | `noFakeMonthlyPhasing` |
| NO_LIQUIDITY_IN_FIN_05 | `noLiquidityInFin05` |
| MANAGEMENT_PNL_IS_NOT_STATUTORY_ACCOUNTING | `managementPnlIsNotStatutoryAccounting` |
| NO_ASSET_LIABILITY_EQUITY_IN_FIN_05 | `noAssetLiabilityEquityInFin05Reporting` |
| VARIANCE_DIRECTION_IS_SEMANTIC | `varianceDirectionIsSemantic` |
| NO_HARDCODED_CURRENCY | `noHardcodedCurrency` |
| COUNTRY_AGNOSTIC / SPORT_AGNOSTIC | `countryAgnostic`, `sportAgnostic` |
| TEAM_NOT_REQUIRED | `teamNotRequired` |
| INTEGER_MINOR_UNITS | `integerMinorUnits` |
| OVERVIEW_IS_INTERPRETIVE | `overviewIsInterpretive` |
| REPORTING_IS_ANALYTICAL | `reportingIsAnalytical` |
| ZEITPLANUNG_IS_MANAGEMENT_WORKSPACE | `zeitplanungIsManagementWorkspace` |
| PUBLICATION_DEFERRED_TO_FIN_06 | `publicationDeferredToFin06` |
| BALANCE_SHEET_DEFERRED_TO_FIN_11 | `balanceSheetDeferredToFin11` |

Tests: `lib/finance/__tests__/finance-05a-reporting-intelligence-architecture.test.ts`

---

## 22. Integration map (existing FIN architecture)

| Programme | FIN-05 consumption |
| --- | --- |
| FIN-01C | Reporting hierarchy — tenant-owned groups/accounts |
| FIN-01E | `FinancialReportingReadModel`, approved budget measure provider |
| FIN-02 | Approved baseline immutability |
| FIN-03A/B | Actual + variance semantics seed |
| FIN-04A–C | Current forecast, version history, reforecast |
| FIN-04B | Automatic forecast as reference measure |
| FIN-04D | Scenarios as analytical inputs |
| FIN-04E | Timing evidence, movement visual **reuse** — not Zeitplanung chart mount |
| FIN-06 | Publication snapshots (future) |
| FIN-09 | Liquidity visuals (out of scope) |
| FIN-11 | Statutory accounting (out of scope) |

---

## 23. FIN-05 package plan

| Package | Focus |
| --- | --- |
| **FIN-05A** | Reporting & Intelligence Architecture (**this document**) |
| **FIN-05B** | Management Reporting Read Models & Variance Engine — [`SCE-FINANCE-05B-MANAGEMENT-REPORTING-READ-MODELS-VARIANCE-ENGINE.md`](./SCE-FINANCE-05B-MANAGEMENT-REPORTING-READ-MODELS-VARIANCE-ENGINE.md) |
| **FIN-05C** | Management P&L / Erfolgsrechnung |
| **FIN-05D** | Finance Übersicht & Decision Intelligence |
| **FIN-05E** | Reporting Workspace & Drill-down |
| **FIN-05F** | Forecast / Budget / Actual Comparative Intelligence |
| **FIN-05G** | Reporting Visual Intelligence & Responsive Hardening |
| **FIN-05H** | Release Hardening & Closure |

Visual intelligence follows read models and decision questions — **charts are not a disconnected decorative package**.

---

## 24. FIN-05A validation

| Suite | Command |
| --- | --- |
| FIN-05A | `npm run test -- lib/finance/__tests__/finance-05a-reporting-intelligence-architecture.test.ts` |
| Finance regression | `npm run test -- lib/finance` |
| Design system | `npm run test:design-system` |
| Lint | changed-path / project lint |
| Build | `npm run build` |

No manual browser UAT in FIN-05A — Product Owner visual UAT in later implementation packages.

---

## 25. Out of scope (FIN-05A)

Full reporting UI, Übersicht redesign, statutory accounting, balance sheet, liquidity/treasury, publication/sharing, fake monthly phasing, new chart library, massive BI filters, FIN-04E reopen.

FIN-05B implementation locks: `SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS` in `finance-reporting-intelligence-architecture-contract.ts`.

**Next package: FIN-05H** — Release Hardening & Closure. FIN-05G visual intelligence complete via PR **#914** → **STAGE** ([`SCE-FINANCE-05G-REPORTING-VISUAL-INTELLIGENCE-RESPONSIVE-HARDENING.md`](./SCE-FINANCE-05G-REPORTING-VISUAL-INTELLIGENCE-RESPONSIVE-HARDENING.md)).
