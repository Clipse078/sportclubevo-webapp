# SCE-FINANCE-04E — Forecast Timing & Expected Financial Events Architecture

| Field | Value |
| --- | --- |
| **Package** | FIN-04E programme — **04E-01** architecture & domain contract (this document) |
| **Status** | **IN PROGRESS** — **04E-01 ARCHITECTURE COMPLETE** (implementation packages **04E-02+** not started) |
| **Branch** | `cursor/sce-finance-04e-forecast-timing` |
| **Base** | `STAGE` after FIN-04A–04D **COMPLETE + MERGED + PO UAT PASS** |
| **Code locks** | `lib/finance/forecast/expected-financial-event-architecture-contract.ts` |
| **Supersedes placeholder** | FIN-04D direction doc [`SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md`](./SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md) (principles preserved; canonical naming updated) |

## Executive summary

FIN-04E adds **temporal intelligence** to SCE Finance forecast capability. After FIN-04A–04D, SCE answers *How much do we expect for the financial year?* reliably. FIN-04E establishes the foundation to eventually answer *When do we expect that money?* — without collapsing annual expectation, timing evidence, effective-date scenarios, actual truth, liquidity, or accounting recognition into one model.

**This package (04E-01) is architecture only:** no persistence, services, UI, charts, cash-flow calculations, scenario effective dates, or liquidity.

---

## Locked principle (prominent)

```text
ANNUAL EXPECTATION  ≠  EXPECTED FINANCIAL TIMING  ≠  EFFECTIVE-DATE ASSUMPTION
```

| Concept | Question |
| --- | --- |
| **A. Annual expectation** | How much is expected for the financial year? |
| **B. Expected financial timing** | When is income/payment expected to occur? |
| **C. Effective-date assumption** | What hypothetical change applies from a point in time? |

FIN-04D v1 scenarios implement **C** only at **annual** grain today. FIN-04E implements **B** over future packages. **C** with *Ab Datum …* follows in **FIN-04E-06** when temporal evidence exists.

Cross-reference: FIN-04D contract `FINANCE_FORECAST_TIMING_LOCKED_PRINCIPLE` (equivalent separation; wording used *cash timing* as early placeholder).

---

## 1. Product problem

Examples SCE cannot yet answer truthfully:

- Federation grant income expected **30.06.2026**
- Sponsor installment expected **01.09.2026**
- Trainer salary expected **31.07.2026**
- Facility invoice expected **15.08.2026**
- Membership-fee collection during a defined period
- Tournament income around an event window

FIN-04D Product Owner UAT exposed that *Mitgliedsbeiträge −10%* is an **annual** assumption. SCE cannot truthfully interpret *Mitgliedsbeiträge −10% ab 01.07.2026* until **temporal financial evidence** exists (FIN-04E).

---

## 2. Canonical concept & naming

| Decision | Value |
| --- | --- |
| **Internal model name** | **`FinanceExpectedFinancialEvent`** |
| **Superseded placeholder** | `FinanceExpectedCashEvent` (FIN-04D direction doc only — not canonical) |
| **Rationale** | FIN-04E represents **expectation**, not settled bank/cash movement. “Cash event” prematurely implies treasury truth. |

**Tenant-facing German (candidates — not locked in 04E-01):**

- Erwarteter finanzieller Vorgang (generic)
- Erwarteter Eingang / Erwartete Zahlung (contextual)
- Erwartete Termine (section)
- Noch nicht terminiert (unscheduled remainder)

Code: `EXPECTED_FINANCIAL_EVENT_GERMAN_PRODUCT_TERMS_CANDIDATES`.

---

## 3. What is an expected financial event?

A **dated expectation** that some **amount** of a **`FinancialAccount`**’s future financial expectation is expected to occur **at or around** a particular time.

| Property (future persistence) | Notes |
| --- | --- |
| `tenantId` | Required — multi-tenant isolation |
| `financeYearId` | Required where annual forecast context applies |
| `financialAccountId` | Required — **direction derived from account** |
| `expectedAmountMinor` | Integer minor units |
| Expected timing | Precision + date / range / month / unscheduled |
| Confidence | Optional lightweight v1 |
| Status | Minimal lifecycle (04E-02+); prefer derivation for “realized” |
| Source | Extensible; **MANUAL** required for v1 |
| Source reference | Optional opaque `{ sourceKind, sourceId }` |
| Audit metadata | Timestamped |

**It is not:** Actual, invoice, bank transaction, commitment duplicate, receivable duplicate, or a replacement **`FinanceForecastVersion`**.

**Role:** **Evidence / temporal decomposition** of remaining (or full-year) expectation — **not** authoritative annual forecast by itself.

---

## 4. Direction — do not duplicate account semantics

`FinancialAccount.canonicalSemantic` (`INCOME` | `EXPENSE` for planning accounts) remains **authoritative**.

- Do **not** add an independently editable `INCOME`/`EXPENSE` direction on the event if it can be derived safely.
- Avoid contradictory states (account = INCOME, event.direction = EXPENSE).
- **Amount convention:** align with FIN-03A — **positive magnitude** on the account; result math uses account semantic. No double inversion via negative amounts on expense accounts.

---

## 5. Timing precision (v1 minimal set)

| Precision | Use when |
| --- | --- |
| `EXACT_DATE` | Contractual due date (e.g. 15.09.2026) |
| `DATE_RANGE` | Event window (e.g. tournament) |
| `MONTH` | Month known, day not (e.g. June 2026 grant) |
| `UNSCHEDULED` | Timing unknown — use reconciliation remainder, not fake dates |

**Rule:** Do not coerce approximate timing into exact dates for charts or liquidity.

---

## 6. Expected date ≠ actual settlement date

- Expected timing **changes**; Actual (FIN-03B) remains **authoritative** when realized.
- Future statuses may include EXPECTED, CANCELLED, SUPERSEDED; **REALIZED** preferably **derived** via Actual/source linkage rather than duplicated state (FIN-04E-02+ decision).

---

## 7. Expected date ≠ accounting recognition (FIN-11)

| Layer | Meaning |
| --- | --- |
| Expected payment/receipt timing | Operational financial timing (FIN-04E) |
| Accounting recognition period/date | Future FIN-11 accrual semantics |

**One date must not mean both.** FIN-04E is not an accrual-accounting engine.

---

## 8. Source model

**v1:** **`MANUAL`** expected events — clubs must not wait for FIN-07/08/09.

**Future operational sources (extensible, not hardcoded enum explosion in core):**

| Source | Programme | Role |
| --- | --- | --- |
| Commitments | FIN-07 | Outgoing payment timing evidence |
| Invoices / receivables | FIN-08 | Incoming receipt timing evidence |
| Sponsor / grant / member fee / registration / trainer / facility / travel / tournament / recurring | Operational domains | Produce or suggest timing |
| Composite / manual | FIN-04E | Normalized timing evidence |

FIN-04E **consumes/normalizes** timing — does **not** duplicate commitment or receivable state.

---

## 9. Relationship to Current Forecast (FIN-04A)

| Layer | Authority |
| --- | --- |
| **Current Forecast** (`FinanceForecastLine.amountMinor`) | Organisation-owned **annual** expectation |
| **Expected financial events** | **Timing profile / evidence** |

**Do not** silently redefine Current Forecast as the sum of events unless an explicit future workflow establishes that relationship.

**Governance:**

| Change | Current Forecast revision? |
| --- | --- |
| Timing only (when, not how much for the year) | **Not necessarily** |
| Total expected **annual** amount | **Yes** — forecast governance |

Do not allow temporal event editing to **silently** change annual forecast totals.

---

## 10. UNSCHEDULED REMAINDER (core concept)

For each account, SCE should eventually explain:

```text
Annual forecast:           X
Actual through cutoff:     A   (FIN-03B + FIN-04C metadata)
Future timed expectation:  T   (sum of valid future expected events)
Future unscheduled:        U   (remaining future expectation not yet timed)
```

**Valid example:**

- Forecast **100'000**, timed **70'000**, unscheduled **30'000** → **30'000 timing unknown** ✓

**Invalid:**

- Spread **30'000** as **5'000/month** for six months without explicit distribution evidence ✗

**Reconciliation states:** `BALANCED` | `UNSCHEDULED_REMAINDER` | `OVERALLOCATED` (timed sum exceeds remaining future expectation — must surface, never silently accept).

**Composition (FIN-04C alignment):**

```text
ACTUAL THROUGH CUTOFF + REMAINING FUTURE EXPECTATION = FULL-YEAR EXPECTATION
```

Timed + unscheduled **partition remaining future expectation only** — do not double-count Actual.

Implementation: **FIN-04E-02+** (not 04E-01).

---

## 11. Actuals, as-of date, and no retroactive scenario effect

FIN-04C provides `asOfDate` and `actualsThroughDate` on forecast revisions. FIN-04E integrates conceptually:

- **Already realized Actual** (through cutoff) vs **remaining future expectation**
- Future effective-dated scenarios (**FIN-04E-06**) operate on **relevant future expectation** — they must **not** reduce realized Actual (e.g. Jan–Jun membership receipts already received).

---

## 12. Recurring expectations (architecture direction)

Example: trainer compensation **2'000/month**.

- Do **not** require twelve manual rows as the only model.
- Preferred future approach: **recurrence rule / schedule template → materialized expected events** (auditable, reconcilable).
- Opaque recurrence-only storage forbidden.

Not implemented in 04E-01.

---

## 13. FIN-04B automatic forecast

FIN-04B remains **stable** — does **not** depend on FIN-04E.

**Future seam:** known installment dates, collection windows, payroll schedules may improve projection **timing** suggestions. Documented in contract; no code coupling in 04E-01.

---

## 14. FIN-04D scenarios

FIN-04D **unchanged** in 04E-01:

- Annual v1 assumptions only
- No `effectiveFrom` / `effectiveTo` on `FinanceScenarioAssumption`
- **Ab Datum …** UX deferred to **FIN-04E-06** when temporal engine exists

---

## 15. FIN-09 liquidity boundary

| FIN-04E | When do we expect financial movement? |
| FIN-09 | Given inflows/outflows and cash position, what is liquidity? |

FIN-04E is **not** liquidity management. Treasury **transfer** semantics (internal cash moves) deferred to FIN-09/11 — not income/expense timing events in 04E.

---

## 16. Finance year boundaries

Distinguish:

- **Financial expectation belonging to FY2027** (annual forecast account amount)
- **Cash timing occurring in January 2028** (payment crosses year boundary)

Do **not** auto-reject events outside finance year without considering liquidity semantics (FIN-09). Tenant-configurable finance year (ADR-018).

---

## 17. Multi-tenant, money, dates

| Topic | Rule |
| --- | --- |
| **Tenant** | All persistence tenant-scoped; source refs cannot cross tenants |
| **Money** | Integer minor units; currency from finance context — no float, no hardcoded CHF |
| **Dates** | **Business dates** (date-only) for expectation; audit timestamps may use instant |
| **Neutrality** | Country-agnostic, sport-agnostic, organisation-agnostic |

---

## 18. UX principles (future — FIN-04E-05)

**SIMPLE UNDERSTANDING · SHALLOW NAVIGATION · DEEP CAPABILITY**

Default questions:

1. How much remains expected?
2. How much is already timed?
3. What is still unscheduled?
4. What important payment/receipt is next?

**Progressive disclosure:** Conclusion → Exception → Explanation → Evidence.

No giant scheduling table by default. Manual entry minimal: Account, Amount, Expected timing, optional description.

**FIN-06:** Detailed payment schedules may be more sensitive than annual forecast — separate publication permission consideration later.

---

## 19. Visual intelligence (future — FIN-04E-07)

Charts must consume **real temporal evidence** — no fake monthly distribution.

Future views: inflows/outflows over time, net movement, timed vs unscheduled, actual vs expected, confidence, scenario-adjusted timing; FIN-09 cumulative liquidity later.

---

## 20. Package sequence (FIN-04E)

| Package | Deliverable |
| --- | --- |
| **04E-01** | Architecture & domain contract (**this document**) |
| **04E-02** | Persistence & reconciliation foundation |
| **04E-03** | Expected event services & manual management |
| **04E-04** | Forecast timing read model & intelligence |
| **04E-05** | Workspace UX |
| **04E-06** | Effective-dated scenario integration |
| **04E-07** | Visual timing intelligence |
| **04E-08** | Hardening & release closure |

**FIN-05** (Financial Reporting & Intelligence) remains **next** after FIN-04E unless Product Owner reprioritizes.

---

## 21. ADR

See **ADR-037** in [`docs/roadmap/05-architecture-decisions.md`](../roadmap/05-architecture-decisions.md).

---

## Related documents

- [`SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md`](./SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md) — locked principles & FIN-04D boundary
- [`SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md`](./SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md)
- [`SCE-FINANCE-04C-ROLLING-FORECAST-ARCHITECTURE.md`](./SCE-FINANCE-04C-ROLLING-FORECAST-ARCHITECTURE.md)
- [`docs/roadmap/SCE-FINANCE-01.md`](../roadmap/SCE-FINANCE-01.md)
