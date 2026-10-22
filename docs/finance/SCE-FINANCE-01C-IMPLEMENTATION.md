# SCE Finance FIN-01C — Financial Structure & Account Framework

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-01c-financial-structure` |
| **Merge target** | `STAGE` |
| **PR** | **#893** (owner merge — not auto-merged by agents) |
| **Closure head (R4)** | `bbdff114545ecc17cba1e0501b66f59874a4c167` |
| **FIN_01C_IMPLEMENTATION** | **COMPLETE** |
| **FIN_01C_PO_UAT** | **PASS** (Product Owner visual/product UAT on R3 Preview — authoritative; Cursor did not perform manual UAT) |
| **FIN_01C_READY_FOR_MERGE** | **YES** |
| **FIN_01C_MERGED** | **NO** |
| **Scope** | Reporting groups, financial accounts (INCOME/EXPENSE leaves), optional starter template, Structure Builder UI |

## PO UAT confirmation (2026-10-22, R3 Preview)

Product Owner visual/product UAT **PASS** confirms:

1. Finance workspace loads; navigation intact; overview nudges unconfigured organisations toward setup without fake KPIs.
2. **Financial Structure Builder** hierarchy is readable (reporting groups as containers, accounts as leaves; compact density; no CRUD-table noise).
3. Contextual **•••** row actions for reporting groups and accounts (rename, move, archive/reactivate, delete separated destructively, subgroup/account creation where applicable).
4. Compact create toolbar; labeled create-account form (Name, Reporting group, Account type); **INCOME** / **EXPENSE** only (no ASSET / LIABILITY / EQUITY construction path in FIN-01C).
5. Existing UAT structure data (e.g. **Beispiel X**) persisted through R3 presentation refactor.
6. FIN-01B Finance Setup regression state accepted (Basiswährung, Finanzjahre, Funktionen, Übersicht vs unavailable capabilities, canonical toggles, starter nudging).
7. SCE user-nudging philosophy retained for FIN-01C surfaces (see programme doc + Design System guidance principle).

## R3 UX closure (accepted)

- Revised Financial Structure Builder hierarchy presentation
- Reporting-group vs account visual distinction
- Contextual row and group/account action menus
- Compact create toolbar and persistent labeled create-account form
- Template/onboarding flow with recommended vs manual paths
- Lightweight contextual nudges (empty state, template next step, blocked delete, archived/view-only guidance)

## Architecture decisions

- **Reporting hierarchy** lives on `FinancialReportingGroup` (tenant tree; cycle-safe reparenting; no cross-tenant references).
- **Financial accounts are leaves** attached via `reportingGroupId` — no account-within-account hierarchy; stable IDs across rename/move.
- **FIN-01C account semantics:** `INCOME`, `EXPENSE` only at construction boundary (schema retains extensibility for FIN-11).
- **Cost centers** remain independent (`FinanceCostCenter` unchanged) — “what kind of money?” vs “where does it belong?”.
- **Templates** are code-defined in `lib/finance/structure/template-registry.ts`; one-time apply → ordinary tenant-owned rows; `FinanceConfiguration.appliedStructureTemplateKey` records application; no permanent template coupling.
- **Lifecycle:** archive/reactivate; dependency-aware deletion; no silent destructive cascades.
- **Future publication (FIN-06):** stable identities and lifecycle semantics support versioned approved snapshots; live data ≠ approved publication (principles preserved in architecture contracts — not implemented in FIN-01C).

## Migration

`prisma/migrations/20261022180000_sce_finance_01c_financial_structure/migration.sql`

### STAGE migration (R2 operational closure)

| Field | Value |
| --- | --- |
| **STAGE_MIGRATION_APPLIED** | **YES** (verified during FIN-01C R2 on designated shared preview database via guarded deploy workflow; reconfirmed R4 via `npm run db:status` → schema up to date) |
| **DUPLICATE_MIGRATION_CREATED** | **NO** |
| **PRODUCTION_TOUCHED** | **NO** |

## Routes

- `/dashboard/finance/structure` — Financial Structure Builder (view: `finance.view`, mutate: `finance.structure.manage`)

## FIN-01C nudging inventory (PO accepted — do not expand in closure)

| Category | FIN-01C status |
| --- | --- |
| Empty-state nudges | **IMPLEMENTED** (structure empty state, template vs manual) |
| Prerequisite nudges | **IMPLEMENTED** (Finance overview setup nudge) |
| Next-action nudges | **IMPLEMENTED** (post-template cue, empty-group hint) |
| Safety nudges | **IMPLEMENTED** (blocked-delete guidance) |
| Permission-aware nudges | **IMPLEMENTED** (view-only guidance) |
| Capability-aware nudges | **NOT_APPLICABLE** (structure route is capability/permission gated; setup nudges live in FIN-01B) |
| Success-state nudges | **DELIBERATELY_OMITTED_TO_AVOID_NOISE** (no permanent success screens) |

Product-wide principle: [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md#user-guidance-nudging).

## Preserved backlog (not FIN-01C blockers)

- **Searchable ISO 4217 currency combobox** for Basiswährung — see [`SCE-FINANCE-01B-IMPLEMENTATION.md`](./SCE-FINANCE-01B-IMPLEMENTATION.md#ux-backlog-post-fin-01b-closure).
