# SCE-FIN-06B-R7 — Final Product Owner UAT & Release Closure

| Field | Value |
| --- | --- |
| **Package** | FIN-06B — Publication Snapshot & Versioning |
| **Environment** | Designated STAGE (FC Allschwil, FY 2026 Erfolgsrechnung) |
| **Branch** | `cursor/sce-finance-06b-publication-snapshot-versioning` |
| **Pull request** | **#917** → **STAGE** |
| **STAGE verify script** | `scripts/sce-finance-06b-r7-stage-publication-closure-verify.ts` (inspect-only) |
| **Product Owner visual UAT** | **Michael** — recorded **2026-10-25** |

## Publication product contract (locked)

Financial **data**, **live reports**, **publications**, **shares**, and **distributed artifacts** are **distinct concepts**.

A **publication** is a **versioned, immutable, auditable snapshot** of an approved reporting state.

**Publishing does not mean:**

- merely opening another copy of the live Erfolgsrechnung;
- exporting the current report without preserving its state;
- rebuilding an old publication from current Finance data.

**Publishing means:**

```text
LIVE REPORT → PUBLISH → IMMUTABLE OFFICIAL VERSION
```

FIN-06B establishes the immutable official-version foundation. The user-facing distribution outcome is intentionally completed in **FIN-06C**:

```text
LIVE REPORT → PUBLISH → OFFICIAL VERSION → DISTRIBUTE
```

## Checkpoint A — Version 1 (state A)

Version 1 was published before the controlled live Current Forecast mutation.

| Measure | PO-verified Version 1 |
| --- | --- |
| Financial year | FY 2026 |
| Expected / Forecast result | **161'533 CHF** |
| Approved budget | **150'000 CHF** |
| Actual | **7'776 CHF** |
| Forecast vs budget | **+11'533 CHF** favorable |
| Mitgliedsbeiträge forecast | **212'694 CHF** |

Version 1 was visually verified after the live finance mutation and **remained unchanged**. Engineering digest evidence confirms `snapshotPayloadJson` did not change.

## Checkpoint B — Live finance after mutation (state B)

Controlled STAGE Current Forecast mutation: Mitgliedsbeiträge **+1'000 CHF**.

| Measure | PO-verified live reporting |
| --- | --- |
| Expected / Forecast result | **162'533 CHF** |
| Budget | **150'000 CHF** |
| Actual | **7'776 CHF** |
| Forecast vs budget | **+12'533 CHF** favorable |
| Mitgliedsbeiträge | **213'694 CHF** |
| Total forecast income | **263'694 CHF** |
| Total forecast expenses | **101'161 CHF** |

Live reporting differed from Version 1 exactly as expected.

## Checkpoint C — Version 2 (captures state B)

Product Owner created Version 2 through **Finance → Berichte → Veröffentlichen**.

UI confirmation:

- *Veröffentlichung erstellt*
- *Version 2 ist als feste Momentaufnahme verfügbar.*

| Measure | PO-verified Version 2 |
| --- | --- |
| Expected / Forecast result | **162'533 CHF** |
| Budget | **150'000 CHF** |
| Actual | **7'776 CHF** |
| Forecast vs budget | **+12'533 CHF** favorable |
| Mitgliedsbeiträge forecast | **213'694 CHF** |
| Total forecast income | **263'694 CHF** |
| Total forecast expenses | **101'161 CHF** |

Version 2 captured the new live financial state.

## Checkpoint D — Immutability contract

Combined PO visual evidence with R5/R6 engineering immutability and versioning tests:

```text
PUBLISH A → VERSION 1 = A
LIVE FINANCE CHANGES TO B
VERSION 1 REMAINS A
PUBLISH AGAIN → VERSION 2 = B
VERSION 1 REMAINS A
```

Canonical example:

| Surface | Expected result | Mitgliedsbeiträge |
| --- | --- | --- |
| V1 | 161'533 CHF | 212'694 CHF |
| Live B | 162'533 CHF | 213'694 CHF |
| V2 | 162'533 CHF | 213'694 CHF |

Historical publication reads **must** use:

`FinancePublicationVersion` → `snapshotPayloadJson` → publication presentation

They **must not** rebuild historical publications from current FIN-05 reporting state.

## Closure gates

| Gate | Result |
| --- | --- |
| **FIN-06B FINAL PRODUCT OWNER VISUAL UAT** | **PASS** |
| **FIN-06B PUBLICATION IMMUTABILITY** | **PASS** |
| **FIN-06B VERSIONING** | **PASS** |
| **FIN-06B-R7 FINAL CLOSURE** | **PASS** |
| **PR #917** | **READY TO MERGE** (when automated gates green) |

## Programme status after closure

| Item | Status |
| --- | --- |
| FIN-06A | **COMPLETE / PO APPROVED** |
| FIN-06B | **COMPLETE / PO APPROVED** |
| FIN-06 (programme) | **IN PROGRESS** (FIN-06C not started) |
| FIN-06C | **NEXT / DEFINED / NOT STARTED** |
| PRODUCTION | **UNTOUCHED** |

## FIN-06C handoff (not implemented in R7)

See [`SCE-FINANCE-06-FINANCIAL-PUBLISHING-SHARING-ARCHITECTURE.md`](./SCE-FINANCE-06-FINANCIAL-PUBLISHING-SHARING-ARCHITECTURE.md) and `FINANCE_06C_*` constants in the architecture contract.

Distribution and export must target a **specific publication version**, never current live FIN-05 state for historical PDFs or shares.
