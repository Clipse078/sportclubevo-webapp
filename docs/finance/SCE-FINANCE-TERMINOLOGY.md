# SCE Finance — canonical terminology (de-CH first)

| de-CH (canonical) | English (canonical) | Definition | Not equivalent to |
| --- | --- | --- | --- |
| Ertrag | Revenue (management) | Management P&L income lines (membership, sponsoring, grants) | Cash receipt, invoice issued |
| Aufwand | Expense (management) | Management P&L cost lines | Payment out, commitment |
| Budget | Budget | Approved plan amount for a period/version | Forecast, Ist |
| Ist | Actual | Realised management amount for the period | Bank movement |
| Forecast / Prognose | Forecast | Expected end-of-period outcome (manual or derived) | Budget, AI prediction |
| Abweichung | Variance | Ist (or Forecast) minus Budget | Error |
| Deckungsbeitrag | Contribution margin | Direct team/area revenue minus direct attributable cost | Profit label for youth teams |
| Zuschussbedarf | Subsidy requirement | Club support needed when contribution margin negative | "Unprofitable team" judgment |
| Selbsttragend | Self-sustaining | Direct revenue covers direct cost (policy-defined) | Mandatory break-even |
| Verpflichtet | Committed | Obligation not yet paid (open purchase/training contract) | Budget, Ist |
| Verfügbar | Available (budget) | Budget − Ist − open commitments | Cash balance |
| Kostenstelle | Cost center | Reporting/control unit (`FinanceCostCenter`) | OrgUnit (may link) |
| Finanzjahr | Finance year | `FinanceYear` date range for budgets/Erfolgsrechnung | Season |
| Saison | Season | Sporting `Season` (ADR-001) | Finanzjahr |
| Erfolgsrechnung | Management P&L | Ertrag / Aufwand / Betriebsergebnis / Jahresergebnis | Swiss OR statutory statement |
| Jahresergebnis | Annual result | Bottom line of management Erfolgsrechnung | Balance sheet equity |

## Money semantics

- Store **`amountMinor`** (integer) + **`currency`** (ISO).
- Display CHF with de-CH formatting via shared `lib/` formatters.
- Never use JavaScript `number` alone for persisted money.
