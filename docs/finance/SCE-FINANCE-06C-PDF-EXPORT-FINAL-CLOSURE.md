# SCE-FIN-06C — PDF / Export Final Closure

| Field | Value |
| --- | --- |
| **Slice** | FIN-06C — **PDF / export** (immutable publication artifact download) |
| **Environment** | Designated STAGE (FC Allschwil, FY 2026 Erfolgsrechnung) |
| **Branch** | `cursor/sce-finance-06c-distribution-export` |
| **Pull request** | **#918** → **STAGE** |
| **Approved visual baseline** | `3c6f169f` — R5R3R1 table-header / first-row geometry fix |
| **Product Owner visual UAT** | **Michael** — **PASS** (recorded **2026-10-26**) |

## Scope lock

This closure covers **PDF generation and download from immutable publication versions only**.

**Not in scope (unchanged / not started):**

- Controlled sharing of a specific immutable publication version
- Email / distribution of a specific immutable publication version
- Generic document management
- Production deployment
- Version 3 creation or mutation of Version 1 / Version 2 snapshots

## Product Owner visual acceptance (locked)

| Criterion | Result |
| --- | --- |
| Tenant-primary branding | **PASS** |
| FCA crest dominance | **PASS** |
| SCE secondary footer endorsement | **PASS** |
| One-page FCA V2 composition | **PASS** |
| Hero hierarchy | **PASS** |
| Management assessment | **PASS** |
| Driver cards | **PASS** |
| Financial statement | **PASS** |
| Numeric column alignment | **PASS** |
| Table header → first-row separation | **PASS** |
| Subtotal hierarchy | **PASS** |
| Ergebnis terminal-row treatment | **PASS** |
| Publication evidence | **PASS** |
| Immutability notice | **PASS** |
| Footer reserve / no text collisions | **PASS** |

```text
FIN-06C PDF / EXPORT PO VISUAL UAT = PASS
```

Approved baseline: **`3c6f169f`** or legitimate descendant after STAGE reconciliation.

## Publication architecture (preserved)

```text
FinancePublicationVersion
  → snapshotPayloadJson
  → FinancePublicationPresentation
  → PDF artifact (on demand)
```

**Forbidden:** rebuilding historical PDFs from current FIN-05 live reporting state.

Artifact persistence rows are **not** introduced in this slice; on-demand generation from frozen snapshots remains canonical.

## Immutability contract (V1 / V2)

| Version | Expected result | Variance vs budget | Mitgliedsbeiträge forecast |
| --- | --- | --- | --- |
| **V1** | **161'533 CHF** | **+11'533 CHF** | **212'694 CHF** |
| **V2** | **162'533 CHF** | **+12'533 CHF** | **213'694 CHF** |

Engineering proofs: `lib/finance/__tests__/finance-06b-r5-immutability.test.ts`, `finance-06b-r6-versioning-contract.test.ts`, FIN-06C PDF artifact tests (snapshot-only read path, no mutation on generate).

## PDF layout regression guards

| Fixture | Expected |
| --- | --- |
| OLD R5R2 publication-evidence overlap | **FAILS_AS_EXPECTED** |
| CURRENT layout | **PASS** |
| OLD R5R3 table-header geometry | **FAILS_AS_EXPECTED** |
| CURRENT layout (incl. R5R3R1) | **PASS** |

## Permission semantics (unchanged)

VIEW ≠ SHARE ≠ PUBLISH. PDF download requires **`finance.publication.view`** (+ **`finance.view`**) — not publish or share authority.

## Accessibility / PDF capability

Preserved: searchable text, metadata, language, contrast, textual favorability semantics, page numbers, grayscale-understandable hierarchy.

**FULL TAGGED PDF / PDF/UA** = **REQUIRES_FUTURE_PDF_ENGINE_DECISION** (pdf-lib limitation — not a FIN-06C blocker).

## Closure gates

| Gate | Result |
| --- | --- |
| **FIN-06C PDF / EXPORT PO VISUAL UAT** | **PASS** |
| **IMMUTABILITY_GATE** | **PASS** |
| **PDF_LAYOUT_CONTRACT** | **PASS** |
| **PERMISSION apples-to-apples vs origin/STAGE** | **PASS** (no new failures) |
| **Automated FIN-06 / FIN-05 regression suites** | **PASS** |
| **Design System governance** | **PASS** |
| **Changed-path ESLint (code)** | **PASS** |
| **Production build** | **PASS** |

Contract: `FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE` in `finance-publishing-sharing-architecture-contract.ts`.

## Programme status after closure

| Item | Status |
| --- | --- |
| FIN-06A | **COMPLETE / PO APPROVED** |
| FIN-06B | **COMPLETE / PO APPROVED** |
| **FIN-06C PDF / export slice** | **COMPLETE / PO APPROVED** |
| FIN-06C controlled sharing | **NOT STARTED** |
| FIN-06C email / distribution | **NOT STARTED** |
| FIN-06 (programme) | **IN PROGRESS** |
| PRODUCTION | **UNTOUCHED** |
