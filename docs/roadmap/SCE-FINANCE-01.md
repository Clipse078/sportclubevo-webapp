# SCE-FINANCE-01 — Organisation Financial Operating System (programme)

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-FINANCE-01` |
| **Status** | **IN_PROGRESS** — foundation package **FIN-01** (FIN-01A/R1, FIN-01B, FIN-01C, FIN-01D, **FIN-01E** complete; merge to **STAGE** via PR **#895** during closure) |
| **Product boundary** | Global, sport-agnostic **management finance** — not full statutory accounting v1 |
| **Principle** | SCE provides the financial engine; the organisation builds its financial structure |
| **First package** | [`SCE-FINANCE-01A`](./SCE-FINANCE-01A.md) (+ **FIN-01A-R1** correction) |
| **Reference import case** | FC Allschwil (FCA) — **not** product schema |

## Programme packages (top-level sequence)

| Package | Focus |
| --- | --- |
| **FIN-01** | Foundation & configurable structure |
| **FIN-02** | Budgeting & approved baseline |
| **FIN-03** | Periodic measurement & budget control |
| **FIN-04** | Rolling forecast & scenarios |
| **FIN-05** | Financial reporting & intelligence |
| **FIN-06** | Financial publishing & sharing |
| **FIN-07** | Commitments & approvals |
| **FIN-08** | Revenue / receivables / collections |
| **FIN-09** | Liquidity & treasury |
| **FIN-10** | Funds / grants / advanced governance |
| **FIN-11** | Accounting integration & advanced finance |

**Sponsor / Commercial:** **NOT STARTED** (separate from Finance workspace).

### FIN-01 executable subpackages

| Sub | Deliverable | Status |
| --- | --- | --- |
| **FIN-01A / R1** | Global architecture, ADRs 016–033, contracts, archetype tests, FCA analyzer (**workbook analysis pending**) | **COMPLETE** (merged to STAGE) |
| **FIN-01B** | Prisma foundation, permissions, capability-driven `/dashboard/finance` shell | **COMPLETE + MERGED + PO UAT PASS** |
| **FIN-01C** | Account/reporting hierarchy + optional templates + Structure Builder UI | **COMPLETE + MERGED + PO UAT PASS** (PR **#893**) |
| **FIN-01D** | Budget foundation / workflow (foundation slice — not entire FIN-02 product) | **COMPLETE + PO UAT PASS** (PR **#894** → **STAGE**) |
| **FIN-01E** | Management reporting foundation (foundation slice — not entire FIN-05 product) | **COMPLETE + PO UAT PASS** (PR **#895** → **STAGE**) |
| **FIN-01F** | Import foundation | **NOT STARTED** |

Do not collapse granular FIN-01 foundation slices into later operational FIN-02…FIN-11 products.

See [`SCE-FINANCE-01A.md`](./SCE-FINANCE-01A.md) for detail and ADR index. FIN-01C closure: [`SCE-FINANCE-01C-IMPLEMENTATION.md`](../finance/SCE-FINANCE-01C-IMPLEMENTATION.md).
