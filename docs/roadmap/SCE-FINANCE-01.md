# SCE-FINANCE-01 — Organisation Financial Operating System (programme)

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-FINANCE-01` |
| **Status** | **IN_PROGRESS** — **FIN-01** foundation complete through **FIN-01E**; **FIN-01F** backlog; **FIN-02** **COMPLETE** (02A–02C merged + PO UAT PASS; **02D DEFERRED / BACKLOG**); **FIN-03** **COMPLETE** (**03A** + **03B** merged + PO UAT PASS — PRs **#900**, **#901** → **STAGE**); **FIN-04** **IN PROGRESS** (**04A** + **04B** **COMPLETE + MERGED + PO UAT PASS** — PRs **#902**, **#903** → **STAGE**; **04C** **IN PROGRESS** — **04C-01** architecture; **04D** **PLANNED**) |
| **Product boundary** | Global, sport-agnostic **management finance** — not full statutory accounting v1 |
| **Principle** | SCE provides the financial engine; the organisation builds its financial structure |
| **First package** | [`SCE-FINANCE-01A`](./SCE-FINANCE-01A.md) (+ **FIN-01A-R1** correction) |
| **Reference import case** | FC Allschwil (FCA) — **not** product schema |

## Programme packages (top-level sequence)

| Package | Focus |
| --- | --- |
| **FIN-01** | Foundation & configurable structure |
| **FIN-02** | Budgeting & approved baseline (**COMPLETE** — **02A–02C COMPLETE + MERGED + PO UAT PASS**; **02D DEFERRED / BACKLOG**) |
| **FIN-03** | Periodic measurement & budget control (**COMPLETE** — **03A** [`SCE-FINANCE-03A-IMPLEMENTATION.md`](../finance/SCE-FINANCE-03A-IMPLEMENTATION.md) + **03B** [`SCE-FINANCE-03B-IMPLEMENTATION.md`](../finance/SCE-FINANCE-03B-IMPLEMENTATION.md) **COMPLETE + PO UAT PASS** → **STAGE**) |
| **FIN-04** | Forecasting programme (**IN PROGRESS** — principle: *SCE generates the projection. The organisation owns the forecast.*) |
| **FIN-04A** | Current Forecast Foundation — **COMPLETE + MERGED + PO UAT PASS** — [`SCE-FINANCE-04A-IMPLEMENTATION.md`](../finance/SCE-FINANCE-04A-IMPLEMENTATION.md) (PR **#902** → **STAGE**) |
| **FIN-04B** | SCE Projection Engine (Automatic Forecast) — **COMPLETE + MERGED + PO UAT PASS** (PR **#903** → **STAGE**) — [`SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md`](../finance/SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md) |
| **FIN-04C** | Rolling Forecast & Reforecasting — **IN PROGRESS** (**04C-01–03** complete; **04C-04** next — [`SCE-FINANCE-04C-ROLLING-FORECAST-ARCHITECTURE.md`](../finance/SCE-FINANCE-04C-ROLLING-FORECAST-ARCHITECTURE.md)) |
| **FIN-04D** | Scenarios & What-if — **PLANNED** |
| **FIN-05** | Financial reporting & intelligence (**NOT STARTED** — includes Management P&L / Erfolgsrechnung) |
| **FIN-06** | Financial publishing & sharing (**NOT STARTED**) |
| **FIN-07** | Commitments & approvals |
| **FIN-08** | Revenue / receivables / collections |
| **FIN-09** | Liquidity & treasury |
| **FIN-10** | Funds / grants / advanced governance |
| **FIN-11** | Accounting integration & advanced finance (**NOT STARTED** — Balance Sheet & financial statements; future **ASSET / LIABILITY / EQUITY** semantics) |

**Sponsor / Commercial:** **NOT STARTED** (separate from Finance workspace).

### FIN-01 executable subpackages

| Sub | Deliverable | Status |
| --- | --- | --- |
| **FIN-01A / R1** | Global architecture, ADRs 016–033, contracts, archetype tests, FCA analyzer (**workbook analysis pending**) | **COMPLETE** (merged to STAGE) |
| **FIN-01B** | Prisma foundation, permissions, capability-driven `/dashboard/finance` shell | **COMPLETE + MERGED + PO UAT PASS** |
| **FIN-01C** | Account/reporting hierarchy + optional templates + Structure Builder UI | **COMPLETE + MERGED + PO UAT PASS** (PR **#893**) |
| **FIN-01D** | Budget foundation / workflow (foundation slice — not entire FIN-02 product) | **COMPLETE + PO UAT PASS** (PR **#894** → **STAGE**) |
| **FIN-01E** | Management reporting foundation (foundation slice — not entire FIN-05 product) | **COMPLETE + MERGED + PO UAT PASS** (PR **#895**) |
| **FIN-01F** | Import foundation | **BACKLOG / LOW PRIORITY** |

Do not collapse granular FIN-01 foundation slices into later operational FIN-02…FIN-11 products.

See [`SCE-FINANCE-01A.md`](./SCE-FINANCE-01A.md) for detail and ADR index. FIN-01C closure: [`SCE-FINANCE-01C-IMPLEMENTATION.md`](../finance/SCE-FINANCE-01C-IMPLEMENTATION.md).
