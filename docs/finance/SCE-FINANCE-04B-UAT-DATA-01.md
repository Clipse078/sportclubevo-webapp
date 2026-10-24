# SCE-FIN-04B-UAT-DATA-01 — STAGE projection PO UAT fixtures

## Purpose

FIN-04B-05R1 is technically complete, but FC Allschwil shared **STAGE** lacked enough `FinanceActualEntry` history for the real SCE projection engine to demonstrate HISTORICAL_PATTERN, RUN_RATE, and INSUFFICIENT behaviours.

This package adds **fictional, STAGE-only** dated actuals and runs the **real** `generateFinanceYearProjection` service. It does **not** change Approved Budget, Current Forecast, methodology, or manually insert projection lines.

## Environment guard (mandatory)

| Check | Expected |
| --- | --- |
| `APP_ENV` | `stage` |
| `SCE_DATA_ENVIRONMENT` | `STAGE` |
| Database fingerprint | `acd3b37682911890` |
| Host prefix | `ep-wispy-hall-aso93dy6` |
| Database name | `neondb` |

**Production is forbidden.** Mutations refuse unless all guards pass.

## Tenant and scenarios

- Tenant: **FC Allschwil** (`fc-allschwil`)
- Target year: **FY 2026** (tenant-defined boundaries)
- Accounts (resolved by name, not hardcoded IDs):

| Account | Target engine behaviour |
| --- | --- |
| Mitgliedsbeiträge | HISTORICAL_PATTERN |
| Personal | HISTORICAL_PATTERN |
| Betrieb | RUN_RATE (FY 2026 only) |
| Weitere Einnahmen | INSUFFICIENT |
| Beispiel X / Beispeil X | INSUFFICIENT (single sparse actual) |

Historical **FY 2024** and **FY 2025** are created only when missing, mirroring FY 2026 date structure.

## Identification / manifest

UAT actuals use deterministic `FinanceActualEntry.description` values:

`SCE_FIN_04B_UAT_DATA_01|<scenario>|<account>|<date>|<amountMinor>`

Apply writes a local manifest:

`/opt/cursor/artifacts/sce-finance-04b-uat-data-01-manifest.json`

## Commands

Inspect (default, non-mutating):

```bash
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  ./node_modules/.bin/tsx scripts/sce-finance-04b-uat-projection-data.ts --inspect
```

Apply (authorized STAGE mutation + real projection generation):

```bash
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  SCE_OPERATION_AUTHORIZATION=sce-finance-04b-uat-projection-data:stage \
  ./node_modules/.bin/tsx scripts/sce-finance-04b-uat-projection-data.ts \
  --apply --confirm SCE-FIN-04B-UAT-DATA-01-APPLY
```

Optional cutoff (ISO date, UTC):

`--cutoff=2026-10-24`

Cleanup (**after PO UAT**, not part of this package execution):

```bash
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  ./node_modules/.bin/tsx scripts/sce-finance-04b-uat-projection-data.ts \
  --cleanup --confirm SCE-FIN-04B-UAT-DATA-01-CLEANUP
```

Cleanup deletes **only** UAT-marked actual entries.

## Implementation

- Core: `lib/finance/uat/sce-finance-04b-uat-projection-data.ts`
- CLI: `scripts/sce-finance-04b-uat-projection-data.ts`
- Projection generation: `generateFinanceYearProjection` (FIN-04B-04)

## Notes

- Fictional amounts are **test fixtures**, not product architecture.
- No future monthly SCE phasing is created (`FORECAST_PHASING_SUPPORTED` remains unchanged).
- Second `--apply` must not duplicate UAT actuals (idempotent descriptions).
