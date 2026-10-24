# SCE-FINANCE-04B-07 — Explainability, confidence & release hardening

| Field | Value |
| --- | --- |
| **Package** | FIN-04B-07 |
| **Status** | **COMPLETE + MERGED + PO UAT PASS** (PR **#903** → **STAGE**) |
| **Branch** | `cursor/sce-finance-04b-projection-engine` |
| **PR** | #903 → STAGE |

## Product principle (locked)

> **SCE generates the projection. The organisation owns the forecast.**

| Domain | Tenant label |
| --- | --- |
| Organisation forecast | **Aktuelle Prognose** |
| System projection | **Automatische Prognose** |

FIN-04B-07 does **not** add forecasting architecture. It hardens trust, explainability, regression coverage, and merge readiness for packages **04B-01 … 04B-06 (+ 06R1, 05R1/R2, UAT-DATA-01)**.

## Capability summary (FIN-04B closure)

- Immutable **Automatische Prognose** snapshots with evidence cutoff and fingerprint staleness
- Deterministic evidence extraction, **data sufficiency** (SUFFICIENT / LIMITED / INSUFFICIENT) separate from **Prognosesicherheit** (HIGH / MEDIUM / LOW / NONE)
- Methodology engine `sce-projection-v1`: HISTORICAL_PATTERN, RUN_RATE, NONE — no user-selectable algorithm
- Expected ranges **only** when historical evidence supports them; run-rate has **no fabricated range**
- Mandatory **Berechnung anzeigen** explainability with structured confidence reasoning (German product copy, no raw enums)
- Refresh creates new projection version; **one** CURRENT pointer via `FinanceProjection.currentProjectionVersionId`
- Explicit adoption → new **Aktuelle Prognose** version; pointer via `FinanceForecast.currentVersionId` (FIN-04B-06R1)
- Adoption provenance in `FinanceProjectionAdoption`
- Tenant isolation, permission enforcement, whole-unit automatic forecast presentation (minor precision preserved internally)
- **No** LLM numerical forecasting; **no** automatic Current Forecast overwrite; **no** monthly phasing fiction

## Historical account identity

Historical pattern matching uses stable **`FinancialAccount.id`** across finance years. Renames do not break identity; archived accounts do not receive active projections. Fuzzy name matching is **out of scope** for FIN-04B.

## UAT data

**SCE-FIN-04B-UAT-DATA-01** remains on shared STAGE after merge (not cleaned up at FIN-04B closure). Cleanup remains documented behind explicit STAGE-only confirmation tokens.

## PO UAT closure

- **FIN-04B-06** functional UAT **PASS** (Michael): after adoption, FY 2026 displayed **Aktuelle Prognose · Version 2** via canonical `currentVersionId` resolution.
- **FIN-04B-07** final PO UAT **PASS** (Michael): full automatic forecast surface, explainability, confidence, refresh/adoption hardening accepted for merge.

## Tests

Release matrix: `lib/finance/__tests__/finance-04b-07-release-hardening.test.ts` plus existing FIN-04B suites (01 architecture … 06 adoption).

## Binary controls

No new binary-setting checkboxes in FIN-04B-07. Adoption confirmation uses dialog actions only.
