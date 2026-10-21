# SCE-FINANCE-01A — Financial Model, Budget Architecture & FCA Reference Analysis

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-FINANCE-01A` |
| **Programme** | [`SCE-FINANCE-01`](./SCE-FINANCE-01.md) |
| **Status** | **READY FOR PO REVIEW (architecture)** — **FCA workbook programmatic analysis BLOCKED** (file not supplied to cloud run) |
| **Branch** | `cursor/sce-finance-01a-architecture-3b73` |
| **STAGE baseline** | `8eb9a000a75a1e3b97fa08eb7746c0096d2ef0e4` (= `origin/STAGE` at preflight) |
| **ADR** | [`ADR-016` … `ADR-025`](./05-architecture-decisions.md#sce-finance-programme-adrs-adr-016--adr-025) |
| **Contracts** | `lib/finance/finance-architecture.ts`, `lib/finance/money-types.ts` |
| **Next** | **FIN-01B** — schema foundation + permissions + workspace shell (**NOT STARTED**) |

## Preflight

| Check | Result |
| --- | --- |
| `START_BRANCH` | `STAGE` |
| `LOCAL_STAGE_BEFORE_FULL` | `8eb9a000a75a1e3b97fa08eb7746c0096d2ef0e4` |
| `ORIGIN_STAGE_BEFORE_FULL` | `8eb9a000a75a1e3b97fa08eb7746c0096d2ef0e4` |
| `CANONICAL_STAGE_FULL` | `8eb9a000a75a1e3b97fa08eb7746c0096d2ef0e4` |
| `FEATURE_BRANCH` | `cursor/sce-finance-01a-architecture-3b73` |
| `SCHEMA_CHANGE` | **NO** |
| `SEED_CHANGE` | **NO** |
| `PRODUCTION_FINANCE_UI` | **NO** (existing `/vereinsleitung/finanzen` demo unchanged) |

---

## 1. Purpose

SCE Finance connects **management planning and intelligence** to existing club objects (Season, OrgUnit, Team, Person, Event, Tournament, Sponsor, Facility, Membership). It is **not** “Excel in a table.” Long-term lenses: PLAN · UNDERSTAND · CONTROL · FORECAST · ACCOUNT/EXPORT.

**v1 excellence:** budgeting, Erfolgsrechnung, variance, team/org/event economics. **Not v1:** statutory GL, balance sheet, VAT, payroll ledger, bank reconciliation.

---

## 2. Existing SCE domain audit

### 2.1 Authoritative entities (reuse — do not duplicate)

| Concept | Canonical model | Notes |
| --- | --- | --- |
| Tenant / Club | `Tenant` | `currency`, `seasonStartMonth`, timezone |
| Season | `Season` | ADR-001 leading sporting entity |
| OrgUnit | `OrgUnit` | Generic org tree; not accounting tree |
| Team | `Team` + `TeamSeason` + `TeamSeasonOrgUnit` | Seasonal sporting unit |
| Person | `Person` | Tenant-scoped master data |
| User / RBAC | `User`, `Role`, `UserRole`, `Permission` | Extend with `finance.*` in FIN-01B |
| PersonAssignment | `PersonAssignment` | Org/team/function — operational, not financial |
| PersonMembership | `PersonMembership` | Club membership lifecycle; future link to contributions |
| Tournament | `Event(type=TOURNAMENT)` | ADR-014 root |
| Club Event | `Event(type=OTHER)` | Veranstaltungen module |
| Match | `Event(type=MATCH)` | Spielbetrieb |
| Training | `TrainingPlan` / training events | Operational — material demand input later |
| Facility | `Facility`, `FacilityResource` | Resource truth |
| Sponsor | `SponsorOrganisation`, `SponsorContact`, `SponsorCategory` | Commercial relationships |

**DUPLICATE_DOMAIN_MODELS_REQUIRED:** **NO**

### 2.2 Existing billing / payments (platform commercial — separate boundary)

| Area | Models / surface |
| --- | --- |
| Platform Stripe link | `TenantBillingAccount` |
| Native invoicing | `LegalEntity`, `BillingCustomer`, `BillingContract`, `Invoice`, `InvoiceLine`, `InvoicePayment`, Swiss QR |
| Money convention | `*Minor` integer fields, CHF default |

Club **management finance** complements but does not merge into `Invoice` in FIN-01. FIN-05 bridges membership fees and sponsor income to postings.

### 2.3 Existing finance UX (demo only)

| Surface | Path | Status |
| --- | --- | --- |
| Vereinsleitung Finanzen | `/vereinsleitung/finanzen` | Demo data, `VEREINSLEITUNG_DEMO_PERMISSIONS` |
| Person Finanzen tab | `PersonDetailTabs` | Gated by `people.finance.view` |
| Platform commercial | `/dashboard/admin/commercial/billing` | Super-admin billing — not club budget |

**Target v1 workspace:** `/dashboard/finance` (canonical shell — FIN-01B).

---

## 3. Target financial model (conceptual → FIN-01B names)

| Concept | Proposed SCE entity | Purpose |
| --- | --- | --- |
| FinancialYear | `FinanceYear` | Budget/Erfolgsrechnung period (≠ Season) |
| FinancePeriod | `FinancePeriod` | Optional sub-periods (month/quarter) |
| Budget | `Budget` | Container per finance year |
| BudgetScenario | `BudgetScenario` | BASELINE, SANIERUNG, … |
| BudgetVersion | `BudgetVersion` | Draft → approved → locked |
| BudgetRevision | `BudgetRevision` | Amendment audit trail |
| FinancialAccount | `FinancialAccount` | Hierarchical category/account tree |
| BudgetLine | `BudgetLine` | Budget measure per account + dimensions |
| FinancialPosting | `FinancialPosting` | Unified spine for BUDGET/ACTUAL/FORECAST/COMMITMENT |
| FinanceCostCenter | `FinanceCostCenter` | Reporting hierarchy (ADR-020) |
| FinanceDimensionAssignment | `FinanceDimensionAssignment` | Typed allocations (ADR-017) |
| FundingSource | `FundingSource` | Grants, Gemeinde, J+S, sponsor bucket |
| Actual / Forecast / Commitment | `FinancialMeasureKind` on posting | ADR-021 |

### 3.1 Account / category hierarchy

Support **Ertrag / Aufwand** reporting groups without hard-coding FCA labels:

- `FinancialAccountType`: `ERTRAG | AUFWAND`
- Optional `FinancialReportingGroup` for rolled-up Erfolgsrechnung (TOTAL_ERTRAG, BETRIEBSERGEBNIS)
- Tenant-specific tree + **SCE sensible defaults** seed per sport/club type (FIN-01C)

Separate `Account` vs `Category` vs `Group`: use **single hierarchical `FinancialAccount`** with `nodeKind` (`GROUP | POSTING`) to avoid over-modeling.

### 3.2 Management Erfolgsrechnung

```
Ertrag (categories…)
  TOTAL ERTRAG
Aufwand (categories…)
  TOTAL AUFWAND
BETRIEBSERGEBNIS
(future: Finanzergebnis, ausserordentlich)
JAHRESERGEBNIS
```

Comparisons: **BUDGET | ACTUAL | FORECAST | VARIANCE_ABSOLUTE | VARIANCE_PERCENT** on same account/dimension slice.

### 3.3 Team economics

Derived metrics (no “profitable team” label):

- **Deckungsbeitrag** = direct team Ertrag − direct team Aufwand (policy defines “direct”)
- **Zuschussbedarf** = max(0, −Deckungsbeitrag) at team level
- **Selbsttragend** when Deckungsbeitrag ≥ 0 (configurable threshold)
- Optional: per-player metrics when roster counts available from `TeamSeason` / squad

### 3.4 OrgUnit finance aggregation

Roll up postings by `FinanceDimensionAssignment` (`ORG_UNIT`, `TEAM`, `FINANCE_COST_CENTER`) walking **authoritative** `OrgUnit.parentId` — ignore organigram canvas coordinates.

### 3.5 Event / tournament mini-P&L

Same engine: filter postings where dimension kind is `CLUB_EVENT` or `TOURNAMENT` (Event id). No separate event-finance module.

### 3.6 Personnel finance

Compensation budgets link to `Person` + optional `PersonAssignment` context. Row-level names require **`people.finance.view`**. Aggregates may show under **`finance.view`** with scope grants.

### 3.7 Material → finance input

Future: operational material requirement → qty × unit price → **`FinancialPosting` BUDGET** with `TEAM` dimension. Finance does **not** own inventory (Material module remains owner).

### 3.8 Multi-year planning

Multiple `FinanceYear` rows; scenarios span years in FIN-03. Assumption drivers (membership growth, inflation) attach to scenario metadata — not FIN-01A implementation.

### 3.9 Liquidity boundary

Result ≠ cash. Future: payment dates, receivables/payables on postings or linked `CashMovement` — **FIN-06**, not FIN-01.

---

## 4. Permissions (proposed)

| Key | Purpose |
| --- | --- |
| `finance.view` | Cockpit + Erfolgsrechnung aggregates |
| `finance.budget.view` | Read budget versions |
| `finance.budget.manage` | Edit draft budgets |
| `finance.actual.view` | View Ist entries |
| `finance.forecast.manage` | Edit forecast |
| `finance.personnel.view` | Aggregate personnel planning (no names unless paired with people.finance) |
| `finance.approve` | Approve/lock budget versions |
| `finance.admin` | Chart of accounts, cost centers, import settings |

**Budget owner scope (future):** `FinanceScopeGrant` → OrgUnit / Team / CostCenter ids, aligned with `UserRole` + org scope modes.

**Personnel privacy:** see ADR-023 and [`SCE-FINANCE-TERMINOLOGY.md`](../finance/SCE-FINANCE-TERMINOLOGY.md).

---

## 5. Finance workspace IA

### V1 navigation (`/dashboard/finance`)

- Übersicht (cockpit)
- Erfolgsrechnung
- Budget
- Teams & Bereiche
- Einstellungen (accounts, cost centers, finance year)

### Future navigation

Forecast · Events · Personal · Verpflichtungen · Liquidität · Rechnungen & Zahlungen · Berichte

Permission-dependent: hide Personal without `finance.personnel.view` / `people.finance.view`; hide approve actions without `finance.approve`.

### Finance cockpit (`/dashboard/finance`)

Headline: revenue, expense, annual result, margin, budget vs ist vs forecast, largest variances (text + sign, not color-only), cost-center attention list, future cash warnings (FIN-06).

Uses SCE Design System workspace, breadcrumbs, context tabs, dense tables with contained horizontal scroll (`sce-dense-ui-foundation`).

---

## 6. Error UX (future)

Actionable codes: `BUDGET_LOCKED`, `FINANCE_PERIOD_CLOSED`, `FINANCE_FORBIDDEN`, `INVALID_ALLOCATION`, `IMPORT_ROW_UNMAPPED`, `IMPORT_DUPLICATE`, `COMMITMENT_EXCEEDS_AVAILABLE` — via `sce-actionable-error-foundation`.

---

## 7. FCA workbook

See [`docs/finance/FCA-WORKBOOK-ANALYSIS.md`](../finance/FCA-WORKBOOK-ANALYSIS.md).

**FIN-01A cloud run:** workbook file **not present** — programmatic sheet/formula analysis **not executed**. Analyzer and tests are in place for PO re-run.

---

## 8. FIN-01 subpackages (executable)

| Sub | Deliverable |
| --- | --- |
| **FIN-01A** | ADRs, contracts, analyzer, terminology (**this PR**) |
| **FIN-01B** | Prisma foundation, `PermissionModule.FINANCE`, `/dashboard/finance` shell |
| **FIN-01C** | Account hierarchy + tenant defaults |
| **FIN-01D** | Budget version workflow + immutability |
| **FIN-01E** | Erfolgsrechnung + variance reports |
| **FIN-01F** | Import assistant v1 (FCA mapper) |

---

## 9. Roadmap FIN-02 … FIN-07

| Package | Scope |
| --- | --- |
| FIN-02 | Team/org/event intelligence dashboards |
| FIN-03 | Scenarios + forecast engine |
| FIN-04 | Commitments + available budget |
| FIN-05 | Membership/sponsor/billing revenue integration |
| FIN-06 | Liquidity/timing |
| FIN-07 | Accounting export/integration |

---

## 10. Design system & security

| Check | Result |
| --- | --- |
| SCE_DESIGN_SYSTEM_COMPLIANCE | **PASS** (inherit v1.0 — no finance-local DS) |
| BINARY_CONTROL_COMPLIANCE | **PASS** |
| NEW_BINARY_CHECKBOXES | **0** |
| TENANT_ISOLATION | All finance entities scoped by `tenantId` |
| PASSWORD_MUTATION | **NO** |

---

## 11. Validation (FIN-01A)

- `vitest run lib/finance`
- `npm run test:design-system`
- `npx prisma validate` + `npx prisma generate`
- Optional: `npm run build` if TypeScript participates in build graph

---

## 12. ADR index

| ADR | Topic |
| --- | --- |
| [016](./05-architecture-decisions.md#adr-016--sce-finance-vs-full-accounting-boundary) | Finance vs full accounting |
| [017](./05-architecture-decisions.md#adr-017--financial-dimensions-architecture) | Dimensions |
| [018](./05-architecture-decisions.md#adr-018--financial-year-vs-sporting-season) | Finance year vs season |
| [019](./05-architecture-decisions.md#adr-019--budget-version-and-scenario-architecture) | Budget/version/scenario |
| [020](./05-architecture-decisions.md#adr-020--cost-center-architecture) | Cost centers |
| [021](./05-architecture-decisions.md#adr-021--actual-forecast-and-commitment-measures) | Measures |
| [022](./05-architecture-decisions.md#adr-022--money-and-currency-representation) | Money |
| [023](./05-architecture-decisions.md#adr-023--personnel-finance-privacy) | Personnel privacy |
| [024](./05-architecture-decisions.md#adr-024--accounting-integration-boundary) | Accounting integration |
| [025](./05-architecture-decisions.md#adr-025--fca-excel-migration-strategy) | FCA Excel migration |
