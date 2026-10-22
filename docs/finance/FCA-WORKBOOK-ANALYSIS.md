# FCA reference workbook analysis (FIN-01A)

| Field | Value |
| --- | --- |
| **Reference file** | `FC_Allschwil_Budget_26-27_Draft_v2.xlsx` |
| **Expected path** | `docs/finance/reference/FC_Allschwil_Budget_26-27_Draft_v2.xlsx` |
| **Analyzer** | `lib/finance/fca-workbook-analyzer.ts` |
| **CLI** | `npx tsx scripts/finance/sce-finance-01a-analyze-fca-workbook.ts` |

## Workbook availability (FIN-01A cloud run)

| Check | Result |
| --- | --- |
| File present in repository | **NO** |
| File present on cloud agent VM | **NO** |
| Programmatic analysis executed on actual FCA file | **BLOCKED** — `FCA_WORKBOOK_NOT_FOUND` |

**Action for PO:** Attach or copy the workbook to the path above and re-run the CLI to generate `docs/finance/FCA-WORKBOOK-ANALYSIS.generated.json`. Update this document from generated output.

The sections below document **product expectations** from the FIN-01A brief and Swiss amateur-club budgeting patterns. They are **not** a substitute for sheet/formula-level verification until the file is analyzed.

---

## Expected workbook structure (to verify programmatically)

Typical FCA-style club budget workbooks include:

| Expected sheet role | Likely content |
| --- | --- |
| Erfolgsrechnung / Budget total | Club-level Ertrag/Aufwand, Budget vs Ist vs Vorjahr, variance |
| Team / Mannschaften | Per-team revenue, cost, subsidy (Deckungsbeitrag / Zuschuss) |
| Personal | Trainer/functions — often sensitive row-level amounts |
| Material | Quantity × unit price planning by team or club |
| Events / Turniere | Event-level income/expense |
| Organisation / Verein | Admin, IT, infrastructure not tied to one team |

## WHAT FCA DOES TODAY (hypothesis — verify with analyzer)

- Single-workbook **management** planning for season **2026/27** with **previous-year actuals** and **variance**.
- **Hierarchical categories** (Ertrag/Aufwand) with club-specific labels.
- **Team economics** columns allocating income/expense to sporting units.
- **Personnel and material** planning embedded in spreadsheets rather than linked operational objects.
- **Excel formulas** for subtotals and cross-sheet references.

## WHAT IS GENERIC TO SPORTS CLUBS

- Seasonal membership fee income and sponsoring tiers.
- Referee, league, and federation fees.
- Pitch/infrastructure costs shared across teams.
- Youth teams subsidised by adult or club-level revenue.
- Event/tournament surpluses/deficits.
- Material and travel as recurring budget blocks.

## WHAT IS FCA-SPECIFIC

- Exact category naming, Gemeinde/J+S lines, and local sponsor labels.
- Team naming matching FCA org structure (Kinderfussball, specific Mannschaften).
- Any hard-coded CHF assumptions, fee schedules, and board-only tabs.

## WHAT SCE SHOULD MODEL DIFFERENTLY

| Excel limitation | SCE approach |
| --- | --- |
| Duplicate team/org labels | Reference `Team`, `OrgUnit`, `TeamSeason`, `PersonAssignment` |
| Silent formula edits | Versioned `BudgetVersion` + audit trail |
| Mixed measures in one cell grid | Explicit `FinancialMeasureKind` rows |
| PII in shared sheets | Permission-gated personnel finance (ADR-023) |
| No tenant isolation | `tenantId` on all finance entities |
| One mutable “the budget” | Scenarios + approved baseline (ADR-019) |

## IMPLICIT DIMENSIONS (expected)

- Season / finance year column headers
- Team / age group columns
- Event/tournament blocks
- Personnel function rows
- Material SKU-style rows (quantity × price)
- Club vs team vs event allocation

## EXCEL LIMITATIONS (generic)

See analyzer output field `excelLimitations` — includes weak referential integrity, audit, and permission model.

---

## Import feasibility (FCA)

| Topic | Assessment |
| --- | --- |
| **FCA_IMPORT_FEASIBILITY** | **HIGH** once workbook is on disk — structure is regular grid + formulas; no LLM required |
| **FCA_IMPORT_MAPPING_MODEL** | Sheet → measure (Budget/Ist/Vorjahr) + row → `FinancialAccount` + column → `FinanceDimensionAssignment` / `FinanceCostCenter` |
| **FCA_IMPORT_AMBIGUITIES** | Team header → `TeamSeason` mapping; merged cells; multi-sheet same category; personnel row → Person vs aggregate; season vs calendar year columns; duplicate category labels |

See ADR-025 and `SCE-FINANCE-01A.md` § Import.
