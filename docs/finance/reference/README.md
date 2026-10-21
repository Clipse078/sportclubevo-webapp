# Finance reference inputs (FIN-01A)

## FC Allschwil budget workbook

Place the PO-supplied reference file here (read-only input — **do not commit club financial data to STAGE** unless explicitly authorised):

`FC_Allschwil_Budget_26-27_Draft_v2.xlsx`

Run programmatic inspection:

```bash
npx tsx scripts/finance/sce-finance-01a-analyze-fca-workbook.ts \
  --out docs/finance/FCA-WORKBOOK-ANALYSIS.generated.json
```

The analyzer is implemented in `lib/finance/fca-workbook-analyzer.ts`.
