# SCE Finance FIN-02B — Controlled Re-baselining

| Field | Value |
| --- | --- |
| **Feature branch** | `cursor/sce-finance-02b-controlled-rebaselining` |
| **Merge target** | `STAGE` |
| **Builds on** | FIN-02A operational budgeting, FIN-01E reporting |
| **FIN-02B status** | **IN PROGRESS** (implementation complete pending PO UAT) |

## Purpose

When an organisation has an **approved governance baseline v1** and prepares a **working revision v2**, FIN-02B defines how v2 becomes the **current** governance baseline without mutating, deleting, or rewriting v1.

```text
APPROVED BASELINE v1 (historical, immutable)
  → WORKING REVISION v2 (DRAFT)
  → readiness / review
  → controlled approval (re-baseline)
  → APPROVED BASELINE v2 (current)
```

## Current baseline semantic

| Concept | Meaning |
| --- | --- |
| **APPROVED** | Version was formally approved; immutable lines + frozen `baseCurrency` + audit fields |
| **Current governance baseline** | The single APPROVED version whose amounts govern live management reporting |

After re-baselining, **multiple APPROVED versions** may exist. Only the **current baseline pointer** identifies which one governs.

## Data model decision

**Chosen:** `FinanceBudget.currentBaselineVersionId` → `FinanceBudgetVersion` (optional, unique).

**Rejected:**

- Richer version status encoding “was current” — older versions remain **APPROVED**, not demoted to a synthetic status.
- Overloading “latest APPROVED by version number” — ambiguous under concurrency and partial failure.

**Invariants (service + DB where feasible):**

1. At most one current baseline per budget (unique pointer column).
2. Pointer references a version on the same budget (FK + service validation).
3. Pointer should reference an **APPROVED** version (service validation on transition).
4. Historical APPROVED versions are never edited to reflect new numbers.

**Migration:** SQL backfill sets the pointer when **exactly one** APPROVED version exists per budget. Multiple APPROVED without pointer is **not guessed** — reporting returns no baseline until resolved manually.

## Transaction

`approveBudgetVersion` runs in a Prisma transaction:

1. Validate readiness (first approval vs re-baseline mode).
2. `UPDATE` version `DRAFT → APPROVED` with frozen currency + audit (conditional on `status = DRAFT`).
3. `UPDATE` budget `currentBaselineVersionId` to the new version.

Failure before commit leaves the prior current baseline unchanged.

## Readiness

Shared checks: currency, draft status, lines, amounts, archived warnings.

| Mode | Extra rule |
| --- | --- |
| **FIRST_APPROVAL** | Block if current baseline already exists |
| **REBASELINE** | Require existing current baseline; do **not** block merely because another APPROVED version exists |

## UX

- First approval: **Baseline freigeben** (unchanged FIN-02A copy).
- Re-baseline: **Neue Baseline freigeben** with dialog explaining history preservation and reporting switch.

## Reporting

`resolveApprovedBudgetMeasure` resolves **current governance baseline** via `currentBaselineVersionId`, with legacy fallback to a **single** APPROVED version only when pointer is null (pre-migration / single-approved tenants).

`reportingContextKey` includes the resolved version id — it changes when the current baseline changes.

## FIN-03 contract (not implemented)

Variance policy when baseline changes mid-year belongs in FIN-03. FIN-02B preserves:

- Distinct version ids
- Per-version approval timestamps
- Historical APPROVED snapshots

## FIN-06 contract (not implemented)

Published snapshots must bind to a **specific budget version id** at publication time. Re-baselining must not retroactively change published artifacts.

## Permissions

Re-baselining uses existing **`finance.approve`** (same authority as first baseline approval).

## Exclusions

- FIN-02C prior-year copy — not started
- FIN-02D budget notes — not started
- FIN-01F import — backlog
- FIN-03 actuals / variance — not started

## Roadmap

| Item | State |
| --- | --- |
| FIN-02A | COMPLETE + MERGED + PO UAT PASS |
| FIN-02B | IN PROGRESS |
| FIN-02C candidate | Annual budget creation & prior-year copy |
| FIN-02D candidate | Budget notes / explanations |
