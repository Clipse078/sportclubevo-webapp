# SCE Finance FIN-01B — Implementation Notes

Foundation persistence and capability-driven `/dashboard/finance` workspace shell on accepted FIN-01A/R1 architecture.

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
