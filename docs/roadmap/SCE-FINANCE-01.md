# SCE-FINANCE-01 — Organisation Financial Operating System (programme)

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-FINANCE-01` |
| **Status** | **IN_PROGRESS** — architecture **01A-R1** correction on branch `cursor/sce-finance-01a-architecture-3b73` |
| **Product boundary** | Global, sport-agnostic **management finance** — not full statutory accounting v1 |
| **Principle** | SCE provides the financial engine; the organisation builds its financial structure |
| **First package** | [`SCE-FINANCE-01A`](./SCE-FINANCE-01A.md) (+ **FIN-01A-R1** correction) |
| **Reference import case** | FC Allschwil (FCA) — **not** product schema |

## Programme packages (recommended sequence after FIN-01A-R1)

| Package | Focus |
| --- | --- |
| **FIN-01** | Finance foundation & configurable structure (architecture + schema + setup + structure builder + budget + income statement + import foundation) |
| **FIN-02** | Financial operations (actuals entry, operational posting flows) |
| **FIN-03** | Financial intelligence (unit/org/event rollups, dashboards) |
| **FIN-04** | Forecasting, scenarios & multi-year planning |
| **FIN-05** | Budget control & approvals (`Available`, commitments) |
| **FIN-06** | Collections & revenue automation (billing bridge, receivables) |
| **FIN-07** | Liquidity & treasury (cash timing, payables, bank accounts) |
| **FIN-08** | Funds, grants & financial governance |
| **FIN-09** | Accounting integration & advanced finance |

### FIN-01 executable subpackages

| Sub | Deliverable |
| --- | --- |
| **FIN-01A / R1** | Global architecture, ADRs 016–033, contracts, archetype tests, FCA analyzer (**workbook analysis pending**) |
| **FIN-01B** | Prisma foundation, permissions, capability-driven `/dashboard/finance` shell, Structure Builder UX |
| **FIN-01C** | Account/reporting hierarchy + optional templates |
| **FIN-01D** | Budget version workflow + immutability |
| **FIN-01E** | Management income statement + variance |
| **FIN-01F** | Import assistant foundation (FCA as reference mapper) |

See [`SCE-FINANCE-01A.md`](./SCE-FINANCE-01A.md) for detail and ADR index.
