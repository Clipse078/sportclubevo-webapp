# SCE-FINANCE-04B-02 — Projection persistence & lifecycle

| Field | Value |
| --- | --- |
| **Package** | FIN-04B-02 |
| **Status** | **IMPLEMENTED** — Prisma migration **applied to designated shared STAGE** (FIN-04B-03) |
| **Migration** | `20261023200000_sce_finance_04b_02_projection_persistence` |
| **Service** | `lib/finance/services/finance-projection-service.ts` (`generateProjectionSnapshot`) |

## Models

| Model | Role |
| --- | --- |
| `FinanceProjection` | One container per `(tenantId, financeYearId)` with `currentProjectionVersionId` |
| `FinanceProjectionVersion` | Immutable generated snapshot; `CURRENT` / `SUPERSEDED`; cutoff, methodology, engine, sufficiency, confidence |
| `FinanceProjectionLine` | `(projectionVersionId, financialAccountId)` annual `projectedAmountMinor`; optional bounds |
| `FinanceProjectionEvidence` | Structured provenance references (kinds, counts, date span, fingerprint) — no ledger clone |
| `FinanceProjectionReasonCode` | Normalised sufficiency/confidence/generation codes |
| `FinanceProjectionAdoption` | Future apply audit (`FIN-04B-06`); no rows without real adoption |

## Lifecycle

1. Explicit generate/refresh calls `generateProjectionSnapshot` with a **validated calculator result** (stub input today).
2. Transaction: ensure container → next `versionNumber` → persist version/lines/evidence/reasons → supersede prior `CURRENT` → update pointer.
3. No public API to mutate historical snapshot amounts; refresh = new version.

## Forecast adoption contract (architecture)

Projection adoption (**FIN-04B-06**) must create a **new** `FinanceForecastVersion` and supersede the previous current version. Ordinary FIN-04A manual edits remain in-place on the current version until FIN-04C may generalise revision semantics.

## Integrity verification (shared STAGE)

Script: `scripts/sce-finance-04b-02-stage-migration-verify.ts` — designated STAGE identity + inventory; expects all listed integrity counters **= 0** after migration apply. Guarded apply requires `APPLY_DATABASE_MIGRATIONS=true`.

## Tests

- `lib/finance/__tests__/finance-04b-02-persistence.test.ts`
- `lib/finance/__tests__/finance-04b-02-migration-deployment-guard.test.ts`
- Architecture guards: `finance-04b-projection-architecture.test.ts`
