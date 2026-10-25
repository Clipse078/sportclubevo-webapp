# SCE-FIN-06B-R6 — Product Owner Version 2 UAT

| Field | Value |
| --- | --- |
| **Environment** | Designated STAGE (FC Allschwil, FY 2026 Erfolgsrechnung) |
| **Feature branch / Preview** | `cursor/sce-finance-06b-publication-snapshot-versioning` — PR **#917** |
| **Engineering prep script** | `scripts/sce-finance-06b-r6-stage-version2-uat-prep.ts` (inspect-only) |
| **Prerequisite** | **FIN-06B-R5 immutability checkpoint = PASS** (Version 1 frozen; live forecast mutated) |

## Locked product model (FIN-06)

```text
LIVE REPORT → PUBLISH → OFFICIAL IMMUTABLE VERSION → DISTRIBUTE (FIN-06C)
```

FIN-06B validates **publish + version history + historical inspection**. FIN-06C will add **distributable artifacts** (PDF, sharing, email). Do not collapse report, publication, and distribution.

## R5 sign-off (recorded)

Product Owner visual UAT confirmed Version **1** did **not** follow the controlled live Current Forecast mutation. Version 1 remains:

| Measure | Version 1 (frozen) |
| --- | --- |
| Forecast result | **161'533 CHF** |
| Approved budget | **150'000 CHF** |
| Actual | **7'776 CHF** |
| Forecast vs budget | **+11'533 CHF** favorable |
| Mitgliedsbeiträge forecast | **212'694 CHF** |

**Do not** alter, reseed, or reconstruct Version 1.

## Version 2 UAT steps (Product Owner only)

Engineering **must not** create Version 2. Use the product UI:

**Finance → Berichte → Veröffentlichen → Veröffentlichen**

### A. Verify LIVE report first

| Measure | Expected (live) |
| --- | --- |
| Forecast result | **162'533 CHF** |
| Approved budget | **150'000 CHF** |
| Actual | **7'776 CHF** |
| Forecast vs budget | **+12'533 CHF** favorable |
| Mitgliedsbeiträge forecast | **213'694 CHF** |

### B. Open Veröffentlichungen → Version 1

Confirm Version 1 still shows **161'533**, **+11'533**, Mitgliedsbeiträge **212'694**.

### C. Close Version 1

### D. Create a new publication (Version 2)

Use **Veröffentlichen** through the UI. Expected: **Version 2**.

### E. Open Veröffentlichungen

Expected history:

- **Version 2** — newest / current publication
- **Version 1** — older / superseded publication

Do **not** delete or replace Version 1.

### F. Open Version 2

| Measure | Expected |
| --- | --- |
| Forecast result | **162'533 CHF** |
| Approved budget | **150'000 CHF** |
| Actual | **7'776 CHF** |
| Forecast vs budget | **+12'533 CHF** favorable |
| Mitgliedsbeiträge forecast | **213'694 CHF** |

### G. Re-open Version 1

Must **still** contain **161'533 CHF**, **+11'533 CHF**, **212'694 CHF** Mitgliedsbeiträge.

**STOP** after screenshots.

## After UAT (explicitly deferred)

- Do **not** restore Current Forecast yet.
- Do **not** merge PR **#917** until FIN-06B final PO approval includes this Version 2 checkpoint.
- Do **not** start FIN-06C implementation in this round.

## Historical read path (must remain)

```text
FinancePublicationVersion → snapshotPayloadJson → versioned snapshot parser
  → publication presentation read model → published report UI
```

Never:

```text
FinancePublicationVersion → current FIN-05 reporting loader
```
