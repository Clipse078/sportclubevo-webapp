# SCE Finance FIN-01C — Financial Structure & Account Framework

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-01c-financial-structure` |
| **Merge target** | `STAGE` |
| **FIN_01C_PO_UAT** | **NOT_YET_PERFORMED** |
| **Scope** | Reporting groups, financial accounts (INCOME/EXPENSE leaves), optional starter template, Structure Builder UI |

## Architecture decisions

- **Reporting hierarchy** lives on `FinancialReportingGroup` (tenant tree).
- **Financial accounts are leaves** attached via `reportingGroupId` — no parallel account-within-account hierarchy.
- **Cost centers** remain independent (`FinanceCostCenter` unchanged).
- **Templates** are code-defined in `lib/finance/structure/template-registry.ts`; application creates ordinary tenant rows and records `FinanceConfiguration.appliedStructureTemplateKey`.
- **Template invariant (FIN-01C):** apply only when structure is empty and no template was applied before.

## Migration

`20261022180000_sce_finance_01c_financial_structure`

## Routes

- `/dashboard/finance/structure` — Financial Structure Builder (view: `finance.view`, mutate: `finance.structure.manage`)
