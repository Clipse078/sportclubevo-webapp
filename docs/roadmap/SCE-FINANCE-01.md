# SCE-FINANCE-01 — Organisation Financial Operating System (programme)

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-FINANCE-01` |
| **Status** | **IN_PROGRESS** — **FIN-01** foundation complete through **FIN-01E**; **FIN-01F** backlog; **FIN-02** **COMPLETE** (02A–02C merged + PO UAT PASS; **02D DEFERRED / BACKLOG**); **FIN-03** **COMPLETE** (**03A** + **03B** merged + PO UAT PASS — PRs **#900**, **#901** → **STAGE**); **FIN-04A–04D** **COMPLETE + MERGED + PO UAT PASS** (PRs **#902**–**#905**, post-merge docs **#906** → **STAGE**); **FIN-04E** Forecast Timing & Expected Financial Events **COMPLETE + MERGED** (04E-01–04E-08; PR **#907** → **STAGE**, merge commit `c1450ef7`) — [`SCE-FINANCE-04E-FORECAST-TIMING-ARCHITECTURE.md`](../finance/SCE-FINANCE-04E-FORECAST-TIMING-ARCHITECTURE.md); **FIN-05A** Reporting & Intelligence Architecture **COMPLETE + MERGED** on **STAGE** (merge commit `b4535134`) — [`SCE-FINANCE-05-FINANCIAL-REPORTING-INTELLIGENCE-ARCHITECTURE.md`](../finance/SCE-FINANCE-05-FINANCIAL-REPORTING-INTELLIGENCE-ARCHITECTURE.md); **FIN-05B** Management Reporting Read Models & Variance Engine **COMPLETE + MERGED** on **STAGE** (merge commit `1cad40593191ebb88d91e5a41aab82a438130a2d`) — [`SCE-FINANCE-05B-MANAGEMENT-REPORTING-READ-MODELS-VARIANCE-ENGINE.md`](../finance/SCE-FINANCE-05B-MANAGEMENT-REPORTING-READ-MODELS-VARIANCE-ENGINE.md); **FIN-05C** Management P&L **IMPLEMENTED** (awaiting PO visual UAT) — [`SCE-FINANCE-05C-MANAGEMENT-PNL.md`](../finance/SCE-FINANCE-05C-MANAGEMENT-PNL.md) |
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
| **FIN-04** | Forecast Intelligence & Scenarios (**COMPLETE** — principle: *SCE generates the projection. The organisation owns the forecast.*; **04A–04D** merged + PO UAT PASS) |

### SCE product-wide UX principle (FIN-04C+)

SCE must **reduce management complexity rather than expose it**. Complex domain models may exist underneath, but default experiences prioritize: conclusions before raw data; progressive disclosure; clear hierarchy; context before detail; exception/decision-oriented presentation; simple language; minimal cognitive load; advanced detail available without making it the default. Applies programme-wide, not Finance only.
| **FIN-04A** | Current Forecast Foundation — **COMPLETE + MERGED + PO UAT PASS** — [`SCE-FINANCE-04A-IMPLEMENTATION.md`](../finance/SCE-FINANCE-04A-IMPLEMENTATION.md) (PR **#902** → **STAGE**) |
| **FIN-04B** | SCE Projection Engine (Automatic Forecast) — **COMPLETE + MERGED + PO UAT PASS** (PR **#903** → **STAGE**) — [`SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md`](../finance/SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md) |
| **FIN-04C** | Rolling Forecast & Reforecasting — **COMPLETE + MERGED + PO UAT PASS** (PR **#904** → **STAGE**) — [`SCE-FINANCE-04C-07-HARDENING-AND-RELEASE-CLOSURE.md`](../finance/SCE-FINANCE-04C-07-HARDENING-AND-RELEASE-CLOSURE.md) |
| **FIN-04D** | Scenarios & What-if — **COMPLETE + MERGED + PO UAT PASS** (PR **#905** → **STAGE**) — [`SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md`](../finance/SCE-FINANCE-04D-SCENARIO-ARCHITECTURE.md), [`SCE-FINANCE-04D-06-SCENARIO-ADOPTION-AND-REBASE.md`](../finance/SCE-FINANCE-04D-06-SCENARIO-ADOPTION-AND-REBASE.md); principles: [`SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md`](../finance/SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md) |
| **FIN-04E** | Forecast Timing & Expected Financial Events — **COMPLETE + MERGED** (04E-01–04E-08; PR **#907** → **STAGE**; PO visual UAT PASS; **04E-08** closure PASS) — [`SCE-FINANCE-04E-08-HARDENING-AND-RELEASE-CLOSURE.md`](../finance/SCE-FINANCE-04E-08-HARDENING-AND-RELEASE-CLOSURE.md) |
| **FIN-05** | Financial reporting & intelligence — **FIN-05A COMPLETE + MERGED**; **FIN-05B COMPLETE + MERGED** (`1cad4059`); **FIN-05C IMPLEMENTED** (Management P&L — PO visual UAT pending); **05D–05H NOT STARTED** — [`SCE-FINANCE-05-FINANCIAL-REPORTING-INTELLIGENCE-ARCHITECTURE.md`](../finance/SCE-FINANCE-05-FINANCIAL-REPORTING-INTELLIGENCE-ARCHITECTURE.md), [`SCE-FINANCE-05B-MANAGEMENT-REPORTING-READ-MODELS-VARIANCE-ENGINE.md`](../finance/SCE-FINANCE-05B-MANAGEMENT-REPORTING-READ-MODELS-VARIANCE-ENGINE.md), [`SCE-FINANCE-05C-MANAGEMENT-PNL.md`](../finance/SCE-FINANCE-05C-MANAGEMENT-PNL.md) |
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
