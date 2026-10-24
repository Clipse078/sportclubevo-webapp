# SCE-FINANCE — Forecast timing & effective-date architecture

| Field | Value |
| --- | --- |
| **Package type** | Architecture / roadmap clarification only — **no implementation** |
| **Branch** | `cursor/sce-finance-04d-scenarios-what-if` |
| **Triggered by** | FIN-04D-05 Product Owner UAT (non-empty scenario validation) |
| **Related** | [`SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md`](./SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md), ADR-036, ADR-016 liquidity boundary |

## Locked principle (prominent)

```text
ANNUAL EXPECTATION  ≠  EXPECTED CASH TIMING  ≠  EFFECTIVE-DATE SCENARIO ASSUMPTION
```

- **Annual expectation** answers: *How much for the financial year?*
- **Expected cash timing** answers: *When do we expect money in or out?*
- **Effective-date scenario assumption** answers: *What changes, from when, on which financial events?*

Do **not** collapse these into one field or one naive formula.

## FIN-04D-05 Product Owner UAT status

| Item | Status |
| --- | --- |
| FIN-04D-05 Scenario workspace UX | **IMPLEMENTATION COMPLETE** |
| FIN-04D-05R1 visual hierarchy | **COMPLETE** |
| Product Owner visual UAT | **PASS** |
| Product Owner non-empty scenario UAT | **PASS** |

**UAT evidence (illustrative only — not product schema):**

- Account: Mitgliedsbeiträge (membership income)
- Baseline (approx.): 236'327 CHF
- Assumption: **−10%** (`PERCENT_CHANGE`)
- Contribution (approx.): −23'633 CHF
- Scenario result (approx.): 161'533 CHF

Authoritative values remain stored **minor units** in the database and calculation engine. Do not hardcode UAT figures into architecture or code.

## FIN-04D v1 scenario semantics (locked)

FIN-04D v1 scenario assumptions are **annual forecast assumptions** at `FinancialAccount` grain.

| Kind | Meaning (full financial year) |
| --- | --- |
| `PERCENT_CHANGE` | Change the **expected full-year** account amount by the specified percentage (basis points). |
| `DELTA_AMOUNT` | Change the **expected full-year** account amount by the specified delta (minor units). |
| `ABSOLUTE_AMOUNT` | Set the **expected full-year** account amount to the specified amount. |
| `EXCLUDE_ACCOUNT` | Set the **expected full-year** account amount to **zero** for the scenario. |

These assumptions **do not currently mean**:

- change from a specific calendar date;
- change for “remaining months” only;
- monthly phasing or cash timing;
- a particular payment or receipt event;
- retroactive adjustment of realized actuals.

Code locks: `SCENARIO_ASSUMPTION_ANNUAL_SEMANTICS_V1` in `scenario-architecture-contract.ts`.

## Do not add effective-date fields to v1 assumptions

**Not in this programme slice:**

- `effectiveFrom`, `effectiveTo`, `startDate`, `endDate` on `FinanceScenarioAssumption`
- **Ab Datum** in the FIN-04D-05 assumption dialog

**Reason:** The v1 engine operates on **annual account amounts** only. A date without trustworthy temporal forecast evidence would imply false precision.

Forbidden field list is locked in `SCENARIO_ASSUMPTION_V1_FORBIDDEN_TEMPORAL_FIELDS`.

## Architecture rule: no naive month proration

**Do not** infer temporal financial impact using:

```text
annual amount × remaining months ÷ 12
```

unless underlying forecast/evidence **explicitly** establishes an even periodic distribution.

Examples where calendar duration alone is **not** financial evidence:

- Membership fees collected predominantly at one point in the year
- Sponsor payments on contractual milestones
- Grants arriving once
- Trainer compensation monthly or event-based
- Tournament income on event dates

Lock: `FINANCE_NAIVE_MONTH_PRORATION_FORBIDDEN`.

## Future finance temporal model (three concepts)

### A. Annual expectation

*How much do we expect for the financial year?*

Examples today:

- Current Forecast account amount (`FinanceForecastLine.amountMinor`)
- Scenario full-year account amount after v1 assumptions

### B. Timing / expected financial events

*When do we expect money to be received or paid?*

Examples (operational cash timing — not accrual recognition in v1):

- Grant expected 30.06.2026
- Salary/payment expected 31.07.2026
- Invoice due 15.08.2026
- Sponsor installment expected 01.09.2026

Future canonical concept (name subject to architecture research):

**`FinanceExpectedCashEvent`** (or equivalent) — **schema not implemented in this package**.

Potential semantics (direction only):

- tenant, `FinanceYear`, `FinancialAccount`
- direction / account semantics
- `expectedAmountMinor`, `expectedDate`
- optional source type / source id
- confidence / status
- linkage to actual settlement when available

### C. Time-based scenario assumption

*What changes, and from when / for which financial events?*

Example: membership income −10% from 01.07.2026.

Must operate on **temporal evidence**, not on pretending the annual amount is uniformly distributed.

Future calculation principle:

```text
known actual
+ future expected financial events / temporal forecast
+ scenario timing assumption
→ scenario-adjusted expectation and timing profile
```

**Not:**

```text
annual amount ÷ 12 × months remaining
```

(unless equal periodic distribution is explicitly supported by evidence.)

## Actual history remains actual

Temporal scenarios must **not** retroactively rewrite realized actuals.

- Jan–Jun receipts already known stay immutable as actual history.
- Scenario timing assumptions apply to **relevant future expectation** (events or forecast evidence), not to past realized amounts.

## Forecast vs cash timing

| Question | Layer |
| --- | --- |
| How much sponsor income this year? | **Annual expectation** (e.g. 50'000) |
| When do installments arrive? | **Timing** (e.g. 25'000 March, 25'000 September) |

Annual forecast value is **not** the same thing as expected cash timing.

## Event timing vs recognition (FIN-11 boundary)

- **Expected receipt/payment date** — initially **operational cash timing**.
- **Accounting recognition period/date** — future FIN-11 may introduce accrual semantics.

Do not overload one date to mean both.

## Source-driven timing (future)

Timing should preferably come from operational evidence, without requiring every source before timing intelligence can start:

| Programme | Role |
| --- | --- |
| **FIN-07** Commitments & approvals | Obligations and expected payment timing |
| **FIN-08** Revenue / receivables / collections | Expected receipts, invoice/due dates, collection timing |
| **FIN-09** Liquidity & treasury | Consumes inflow/outflow timing → cash-flow curve, liquidity projection, peaks/shortfalls |
| **FIN-04** Forecast intelligence | Temporal forecast evidence; effective-date scenario assumptions; inflow/outflow profile; timing confidence |

Core timing model remains **source-agnostic** where evidence is manual or composite.

## Roadmap integration (FIN-04)

Within **FIN-04 — Forecast Intelligence**, future timing capability includes:

- temporal forecast evidence;
- effective-date scenario assumptions (when engine supports them);
- expected inflow/outflow profile;
- forecast timing confidence.

**Status:** **PLANNED / ARCHITECTURE DIRECTION** — not implemented.

## FIN-04D-06 boundary (unchanged)

This clarification **does not delay FIN-04D-06**.

FIN-04D-06 remains:

- **Scenario adoption** (+ optional explicit **rebase**)
- using **annual** v1 scenario semantics

Adoption copies calculated **full-year** scenario amounts into a formal Current Forecast revision. Rebase replaces the frozen annual starting point explicitly. Neither requires temporal assumptions.

**Next package after this doc:** **FIN-04D-06**.

## Future scenario UX (progressive disclosure — not implemented)

**Current default (FIN-04D-05):**

- **Art der Veränderung:** Prozent · Betrag +/- · Betrag festlegen · Aus Variante entfernen

**Future extension (when temporal engine exists):**

- **Zeitraum:** **Gesamtes Finanzjahr** (default) · **Ab Datum …** (advanced)

**Ab Datum** must only appear when the engine has trustworthy temporal evidence for the affected scope.

## Visual intelligence connection (future)

Finance-wide visual intelligence backlog (see FIN-04C-05R2) should eventually support:

- periodic expected inflows / outflows
- net movement and cumulative liquidity
- actual vs expected timing
- scenario-adjusted timing profiles (e.g. grant spike 30 June, salary outflow 31 July)

**Not built in this package.** No new chart-library architecture here.

## Confidence (future)

Expected dates may carry different certainty (contractual due date vs estimated tournament income). Architecture should allow confidence/status where useful — **not implemented now**.

## Neutrality

All temporal concepts remain **country-agnostic**, **sport-agnostic**, and **organisation-agnostic**. Documentation examples may use illustrative amounts or dates; they must not become hardcoded schema (no CHF/SFV/J+S/Swiss season rules in core models).

## Explanatory examples (architecture only — not implemented)

### Membership income −10% from 01.07

Apply −10% to **future** membership expectation after 01.07 per temporal evidence; do not reduce Jan–Jun actuals already received.

### Trainer cost +20'000 from 01.08

If evidence is recurring monthly compensation, apply to relevant future schedule; if one-off payment, follow that event — do not infer without evidence.

### Sponsor drops out from 30.06

Income received before effective point remains; remove or adjust **future expected** receipts per evidence after 30.06.

## Related documents

- [`SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md`](./SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md) — §5 assumptions, §9 actuals/timing boundary
- [`SCE-FINANCE-04D-05-SCENARIO-WORKSPACE-UX.md`](./SCE-FINANCE-04D-05-SCENARIO-WORKSPACE-UX.md) — PO UAT closure
- [`docs/roadmap/SCE-FINANCE-01.md`](../roadmap/SCE-FINANCE-01.md) — programme status
- ADR-036 in [`docs/roadmap/05-architecture-decisions.md`](../roadmap/05-architecture-decisions.md)
