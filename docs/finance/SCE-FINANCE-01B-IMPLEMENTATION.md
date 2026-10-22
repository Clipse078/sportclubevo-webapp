# SCE Finance FIN-01B — Implementation Notes

Foundation persistence and capability-driven `/dashboard/finance` workspace shell on accepted FIN-01A/R1 architecture.

## Closure status

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-01b-foundation-52a1` |
| **Merge target** | `STAGE` |
| **PR** | **#892** (owner merge — not auto-merged by agents) |
| **Closure baseline** | `a25fadca137375e479ba1f9aeeb79037e7f26f1d` |
| **FIN_01B_PO_UAT** | **PASS** (Product Owner visual UAT — authoritative; Cursor did not perform manual UAT) |
| **FIN_01B_COMPLETE** | **YES** (closure package; no FIN-01C scope in this branch) |

### PO UAT confirmation (2026-10-22)

Product Owner visual UAT **PASS** confirms:

1. `/dashboard/finance` reachable for authorized FC Allschwil Club Admin.
2. Navigation: **Finanzen** and **Sponsoring** as separate entries (not a combined Finance concept).
3. Legacy combined label **Finanzen & Partnerschaften** is no longer the Finance navigation concept.
4. Finance setup reachable; base currency configuration visible.
5. Finance years configurable independently from sporting seasons.
6. Finance capability configuration visible under **Funktionen**; descriptions visible without hover.
7. Implemented capability **Übersicht** distinguishable from unavailable capabilities.
8. Unavailable capabilities show **Noch nicht verfügbar**; switches cannot be activated.
9. Starter guidance: **Empfohlen für den Start** / *Startet mit der Übersicht. Weitere Finanzfunktionen werden schrittweise verfügbar und können später jederzeit ergänzt werden.* — does not pretend unavailable functionality is usable.
10. **Übersicht** toggle uses canonical SCE switch/toggle pattern.
11. No fake/demo financial KPIs in canonical Finance workspace; setup state is honest and configuration-driven.

## Production models

| Model | Role |
| --- | --- |
| `FinanceConfiguration` | Tenant setup status, base currency, current finance year |
| `FinanceYear` | Configurable reporting period (optional `seasonId`) |
| `FinanceTenantCapability` | Tenant enablement for system capabilities |
| `FinanceCostCenter` | User-managed cost center tree |
| `FinancialAccount` | Account hierarchy with canonical semantics |
| `FinancialReportingGroup` | Reporting presentation hierarchy |

Migration: `20261022120000_sce_finance_01b_foundation`

## Service boundaries

- `lib/finance/services/*` — mutations with tenant isolation, RBAC, hierarchy integrity
- UI routes under `app/(admin)/dashboard/finance` call server actions only (`actions.ts`)
- No Prisma access from React presentation components

## Permissions

| Key | Purpose |
| --- | --- |
| `finance.view` | Workspace access and read-only finance surfaces |
| `finance.structure.manage` | Cost center / account / reporting structure mutations |
| `finance.admin` | Configuration, financial years, capabilities |

Person compensation remains `people.finance.view` / `people.finance.manage` (ADR-023).

## Routes

- `/dashboard/finance` — overview (honest empty/setup states)
- `/dashboard/finance/settings` — setup (requires `finance.admin` or structure manage for tabs)

Legacy demo `/vereinsleitung/finanzen` (and `/vereinsleitung/finanzen/rechnungen`) **redirect** to `/dashboard/finance` (FIN-01B-R1). The historical demo UI is no longer a competing primary Finance destination; authorization follows `finance.view` on the canonical workspace.

Club navigation (Führung): **Finanzen** → `/dashboard/finance` (`finance.view`). Sponsoring remains a separate destination under the future commercial capability boundary.

## Deferred (explicit)

Full Structure Builder UI, budgets, postings, FCA import, receivables/payables, sponsor/commercial.

### UX backlog (post FIN-01B closure)

- **SEARCHABLE CURRENCY COMBOBOX (Basiswährung):** the current free-text ISO currency input is **temporary**. Future Finance Setup UX must replace it with a searchable currency selector backed by a **complete currency dataset** (not a manually maintained shortlist). Expected behaviour:
  - search by ISO 4217 currency code and currency name; useful country/region aliases where appropriate
  - typing `CH` surfaces **CHF** prominently; `CHF` surfaces CHF; `Swiss` surfaces CHF where localized search supports it
  - typing `US` surfaces **USD** prominently; `USD` surfaces USD
  - keyboard navigation; accessible combobox semantics; localized display names where supported
  - **no Swiss-specific assumptions** in Finance core; tenant base currency remains ISO 4217 based
  - do **not** implement in FIN-01B closure

### Architecture / product backlog (preserved — not FIN-01B scope)

Explicit future packages remain documented in programme roadmap [`SCE-FINANCE-01`](../roadmap/SCE-FINANCE-01.md) and FIN-01A architecture — **do not implement during FIN-01B closure**:

- periodic budget measurement; Budget vs Actual; Forecast; rolling forecast / rolling budget where appropriate
- reporting; publishing/sharing financial results internally and externally
- cost-center **Structure Builder** UX; account/reporting hierarchy UX
- projects; funds; receivables; payables; commitments; approvals; liquidity; accounting integration
