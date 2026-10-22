# SCE-FINANCE-01A — Financial Model, Budget Architecture & FCA Reference Analysis

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-FINANCE-01A` |
| **Programme** | [`SCE-FINANCE-01`](./SCE-FINANCE-01.md) |
| **Status** | **FIN-01A-R1** — global/sport-agnostic architecture correction (**READY FOR PO REVIEW**) |
| **Branch** | `cursor/sce-finance-01a-architecture-3b73` |
| **PR** | **#891** → `STAGE` (draft, not merged) |
| **ADR** | [`ADR-016` … `ADR-033`](./05-architecture-decisions.md#sce-finance-programme-adrs-adr-016--adr-033) |
| **Contracts** | `lib/finance/finance-architecture.ts`, `lib/finance/finance-archetypes.ts`, `lib/finance/money-types.ts` |
| **Next** | **FIN-01B** — schema foundation + capability-driven workspace (**NOT STARTED**) |

## FIN-01A-R1 correction summary

FIN-01A established the first finance architecture but retained FC Allschwil / football / Swiss-shaped defaults in contracts and navigation. **FIN-01A-R1** reclassifies those as reference, localization, or templates and locks:

- **Canonical financial semantics** (typed account semantics, measures, version lifecycle)
- **Configurable organisational semantics** (tenant-owned hierarchies, scenario names, dimensions)
- **Capability-driven UX** (no hardcoded German five-tab navigation)
- **FCA role** = reference implementation & import case only (`FCA_WORKBOOK_PROGRAMMATIC_ANALYSIS = PENDING`)

## Preflight (R1)

| Check | Result |
| --- | --- |
| `FEATURE_BRANCH` | `cursor/sce-finance-01a-architecture-3b73` |
| `SCHEMA_CHANGE` | **NO** |
| `SEED_CHANGE` | **NO** |
| `PRODUCTION_FINANCE_UI` | **NO** |

---

## 1. Purpose

SCE Finance is the **management finance engine** for sports organisations globally. It connects planning and intelligence to **optional** SCE domain objects (Season, OrgUnit, Team, Person, Event, …). None of these are required for finance to function.

Long-term lenses: PLAN · UNDERSTAND · CONTROL · FORECAST · ACCOUNT/EXPORT.

**v1 boundary:** budgeting, management income statement, variance, optional unit/event economics. **Not v1:** statutory GL, full balance sheet, VAT engine, payroll ledger, bank reconciliation.

---

## 2. Domain audit (reuse — do not duplicate)

Authoritative SCE entities remain the source of truth when linked. Finance adds tenant-configurable **`FinanceYear`**, **`FinancialAccount`**, **`FinanceCostCenter`**, **`BudgetScenario`** (tenant-named), **`FinanceProject`**, **`FinanceFund`**, **`FundingSource`**, postings, and dimension assignments.

**DUPLICATE_DOMAIN_MODELS_REQUIRED:** **NO**

Platform billing (`Invoice`, payment rails) stays a separate commercial boundary.

---

## 3. Target financial model (conceptual → FIN-01B schema)

| Concept | Purpose |
| --- | --- |
| `FinanceYear` | Configurable reporting period (≠ Season) |
| `FinancePeriod` | Optional sub-periods |
| `FinancialAccount` | Tenant account/reporting hierarchy + **canonical semantic** |
| `FinanceCostCenter` | Tenant cost hierarchy (≠ OrgUnit tree) |
| `Budget` / `BudgetScenario` / `BudgetVersion` | Versioned, scenario-aware budgets |
| `FinancialPosting` | Unified BUDGET/ACTUAL/FORECAST/COMMITMENT spine |
| `FinanceDimensionAssignment` | Optional typed + custom dimensions |
| `FinanceProject` | Cross-year initiatives (sport-independent) |
| `FinanceFund` / `FundingSource` | Restricted/unrestricted money (future ops in FIN-08) |

### 3.1 Account vs cost center

- **Cost center** → *where* (tenant tree)
- **Account** → *what kind* (tenant tree + typed semantics)

No universal Ertrag/Aufwand/Material tree in core — optional templates only.

### 3.2 Management income statement

Canonical computed lines: total income, total expense, operating surplus/deficit, net surplus/deficit. Localized layouts include Swiss Erfolgsrechnung when tenant/country template enables it.

### 3.3 Scenarios

Tenants create and name scenarios freely. Optional semantic flag marks baseline vs comparison — **not** hardcoded SANIERUNG / INVESTITION_JUGEND types.

### 3.4 Future operations (architecture only in FIN-01A)

Receivables/payables, refunds/credits/waivers, gross/fee/net payment splits, multiple bank accounts — documented in contracts; implementation in FIN-06+.

---

## 4. Permissions

See `PROPOSED_FINANCE_PERMISSION_KEYS` in contracts. **`finance.structure.manage`** is separate from **`finance.view`**. Personnel privacy per ADR-023.

---

## 5. Finance workspace IA (capability-driven)

Navigation entries are driven by **`FINANCE_CAPABILITY_KEYS`**, permissions, and tenant settings — see ADR-028. Example capability sets:

- **Minimal:** Overview, Budget, Income & expenses, Reports
- **Advanced:** + Forecast, Cost centers, Projects, Funds, Commitments, Liquidity, Accounting integration

Team/org/event/personnel analysis is **contextual**, not a global mandatory nav section.

### Structure Builder (FIN-01B recommendation)

Tree/table hybrid, inline rename, drag reparent, inspector, command search, archive/delete guards, keyboard accessible — see `FINANCE_STRUCTURE_BUILDER_UX_RECOMMENDATION`.

---

## 6. FCA workbook

See [`docs/finance/FCA-WORKBOOK-ANALYSIS.md`](../finance/FCA-WORKBOOK-ANALYSIS.md).

**Status:** workbook not supplied in cloud run — **`FCA_WORKBOOK_PROGRAMMATIC_ANALYSIS = PENDING`**. Does not block generic architecture; blocks final FCA import validation only.

---

## 7. Organisation archetype validation

Eight archetypes validated via `lib/finance/finance-archetypes.ts` and automated tests (Swiss football, Dutch hockey, German multi-sport, UK swimming, US basketball, tennis, federation, camp/event org).

---

## 8. Roadmap (revised)

See [`SCE-FINANCE-01.md`](./SCE-FINANCE-01.md) for FIN-01–FIN-09 sequence.

---

## 9. Design system & security

| Check | Result |
| --- | --- |
| SCE_DESIGN_SYSTEM_COMPLIANCE | **PASS** |
| BINARY_CONTROL_COMPLIANCE | **PASS** |
| TENANT_ISOLATION | All finance entities scoped by `tenantId` |

---

## 10. Validation

- `vitest run lib/finance`
- `npm run test:design-system`
- `npx prisma validate` + `npx prisma generate`
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`

---

## 11. Implementation readiness (corrected)

| Gate | Result |
| --- | --- |
| Global architecture passes R1 locks | **YES** |
| FCA assumptions removed from core | **YES** |
| Configurable structure architecture accepted | **YES** (contracts + ADRs) |
| Capability-driven UX accepted | **YES** (ADR-028) |
| Archetype validations | **PASS** (automated) |
| FCA workbook analysis | **PENDING** (isolated — does not invalidate generic architecture) |
| `SCE_FINANCE_01A_R1_READY_FOR_PO_REVIEW` | **YES** |
| `SCE_FINANCE_01_ARCHITECTURE_READY_FOR_IMPLEMENTATION` | **YES** (FIN-01B may proceed; FCA import validation remains pending) |

---

## 12. ADR index

| ADR | Topic |
| --- | --- |
| [016](./05-architecture-decisions.md#adr-016--sce-finance-vs-full-accounting-boundary) | Finance vs full accounting |
| [017](./05-architecture-decisions.md#adr-017--financial-dimensions-architecture) | Dimensions + custom dimensions |
| [018](./05-architecture-decisions.md#adr-018--financial-year-vs-sporting-season) | Finance year vs season |
| [019](./05-architecture-decisions.md#adr-019--budget-version-and-scenario-architecture) | Budget/version/scenario |
| [020](./05-architecture-decisions.md#adr-020--cost-center-architecture) | Cost centers |
| [021](./05-architecture-decisions.md#adr-021--actual-forecast-and-commitment-measures) | Measures |
| [022](./05-architecture-decisions.md#adr-022--money-and-currency-representation) | Money |
| [023](./05-architecture-decisions.md#adr-023--personnel-finance-privacy) | Personnel privacy |
| [024](./05-architecture-decisions.md#adr-024--accounting-integration-boundary) | Accounting integration |
| [025](./05-architecture-decisions.md#adr-025--fca-excel-migration-strategy) | FCA Excel migration |
| [026](./05-architecture-decisions.md#adr-026--tenant-owned-finance-structure) | Tenant-owned structure |
| [027](./05-architecture-decisions.md#adr-027--canonical-vs-configurable-financial-semantics) | Canonical vs configurable semantics |
| [028](./05-architecture-decisions.md#adr-028--capability-driven-finance-ux) | Capability-driven UX |
| [029](./05-architecture-decisions.md#adr-029--localization-and-optional-templates) | Localization & templates |
| [030](./05-architecture-decisions.md#adr-030--funds-funding-sources-and-restrictions) | Funds & restrictions |
| [031](./05-architecture-decisions.md#adr-031--finance-projects) | Projects |
| [032](./05-architecture-decisions.md#adr-032--account-hierarchy-and-reporting-structure-lifecycle) | Account hierarchy |
| [033](./05-architecture-decisions.md#adr-033--custom-reporting-dimensions) | Custom dimensions |
