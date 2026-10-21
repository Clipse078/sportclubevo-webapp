# SCE Finance — terminology and localization

## Core vs localization

| Layer | Role |
| --- | --- |
| **Core (typed)** | Account semantics (`INCOME`, `EXPENSE`, …), measure kinds, version status, money representation |
| **Tenant configuration** | Account/cost center/scenario **display names**, hierarchy shape, enabled capabilities |
| **Localization** | Language, regional report titles, number/date formats, country templates, tax hints |
| **Reference / examples** | FCA labels, Swiss grant provider names, football team column headers |

Core contracts live in `lib/finance/finance-architecture.ts`. **No core enum requires German or Swiss labels.**

## Management income statement (canonical report)

| Canonical concept | Example localized labels |
| --- | --- |
| Management income statement | Profit & Loss, Income Statement, Erfolgsrechnung, Statement of Activities |
| Income subtotal | Total income, Total Ertrag |
| Expense subtotal | Total expense, Total Aufwand |
| Operating surplus/deficit | Operating result, Betriebsergebnis |
| Net surplus/deficit | Annual result, Jahresergebnis |

`SWISS_ERFOLGSRECHNUNG_SUPPORTED = YES` via localization templates. `SWISS_ERFOLGSRECHNUNG_REQUIRED_GLOBALLY = NO`.

## de-CH reference table (localization — not core schema)

| de-CH (example) | English (example) | Maps to canonical |
| --- | --- | --- |
| Ertrag | Revenue (management) | `INCOME` |
| Aufwand | Expense (management) | `EXPENSE` |
| Budget | Budget | measure `BUDGET` |
| Ist | Actual | measure `ACTUAL` |
| Forecast / Prognose | Forecast | measure `FORECAST` |
| Abweichung | Variance | reporting calc |
| Deckungsbeitrag | Contribution margin | `CONTRIBUTION_MARGIN` |
| Zuschussbedarf | Subsidy requirement | `SUBSIDY_REQUIREMENT` |
| Selbsttragend | Self-sustaining | `SELF_SUSTAINING` |
| Verpflichtet | Committed | measure `COMMITMENT` |
| Verfügbar | Available (budget) | derived (FIN-05) |
| Kostenstelle | Cost center | `FinanceCostCenter` |
| Finanzjahr | Finance year | `FinanceYear` |
| Saison | Season | optional dimension |

## Money semantics

- Store **`amountMinor`** (integer) + **`currency`** (ISO 4217).
- Tenant base currency is configurable — CHF is an example only.
- Never use JavaScript `number` alone for persisted money.

## Personnel privacy (ADR-023)

- `people.view` ≠ compensation visibility.
- Individual compensation requires `people.finance.view` / `people.finance.manage`.
- Aggregate personnel planning may use `finance.personnel.view` without line-item names.
