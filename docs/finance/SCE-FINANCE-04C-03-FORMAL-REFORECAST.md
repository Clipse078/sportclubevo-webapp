# SCE-FINANCE-04C-03 — Formal Reforecast Service

| Field | Value |
| --- | --- |
| **Package** | FIN-04C-03 — formal reforecast application service + server action foundation |
| **Status** | **COMPLETE** (FIN-04C-04 complete — see [`SCE-FINANCE-04C-04-HISTORY-COMPARISON.md`](./SCE-FINANCE-04C-04-HISTORY-COMPARISON.md)) |
| **Tenant action** | **Neue Prognose festhalten** |
| **Code** | `lib/finance/services/finance-forecast-formal-reforecast-service.ts`, `app/(admin)/dashboard/finance/forecast/actions.ts` |

## Product action

**Neue Prognose festhalten** is the explicit management checkpoint where the organisation records:

> This is now our formally recorded current expectation.

Ordinary line edits already persist on the living **CURRENT** version. This action creates governance history without changing financial amounts.

## Lifecycle example

Before:

- `FinanceForecast.currentVersionId` → v2 (CURRENT, editable)

After **Neue Prognose festhalten** (Datenstand 30.09.2026, label “Q3 Review”):

| Version | Status | Metadata | Amounts |
| --- | --- | --- | --- |
| v2 | SUPERSEDED | legacy / unchanged | frozen snapshot X/Y/Z |
| v3 | CURRENT | `MANUAL_REFORECAST`, Q3 Review, Datenstand | copy of X/Y/Z |

`FinanceForecast.currentVersionId` → v3.

**Metadata ownership (canonical):** revision metadata (`revisionSource`, `revisionLabel`, `asOfDate`, `actualsThroughDate`, `previousVersionId`) is attached to the **promoted CURRENT** (v3). The superseded version (v2) is immutable history with whatever metadata it already had (often null for legacy rows).

Because CURRENT remains editable, v3 amounts are not historically frozen until v3 is superseded by the **next** formal revision. FIN-05 accuracy analysis should use **SUPERSEDED** checkpoints.

## Preview (read-only)

`previewFormalCurrentForecast` resolves:

- finance year + forecast pointer
- current version id/number and next version number
- income / expense / result (`amountMinor`, INCOME/EXPENSE semantics)
- Datenstand / actuals cutoff (with defaults — see dates)
- optional normalized label
- previous formal revision summary when available
- explicit flag: amounts do not change on formalization

No writes.

## Formalization service

`formalizeCurrentForecast`:

1. Enforces `finance.forecast.manage`
2. Validates tenant + finance year + expected current version id
3. Validates dates + optional label
4. Calls `persistFormalForecastRevision` with `revisionSource = MANUAL_REFORECAST` (not caller-controlled)
5. Sets `sourceProjectionVersionId = null` (no automatic forecast side effects)
6. Returns typed result (version ids, metadata, totals, line count)

## Date semantics

- **Datenstand / `asOfDate`** and **`actualsThroughDate`** are required inputs at formalization time (ISO `YYYY-MM-DD`, UTC calendar semantics via `finance-calendar-date.ts`).
- When the caller omits **`actualsThroughDate`**, the application layer defaults it to **`asOfDate`**. An earlier actual cutoff remains supported when explicitly provided.
- **`actualsThroughDate` must not be after `asOfDate`.**
- Both dates must fall within the tenant **FinanceYear** (calendar and non-calendar years).
- **`recommendFormalReforecastAsOfDate`** may suggest today when today lies inside the finance year (UI recommendation only).

## Concurrency & duplicate submit

- **`expectedCurrentForecastVersionId`** is mandatory.
- Stale expected id → `FINANCE_FORECAST_REVISION_STALE_CURRENT` / action outcome **`STALE_CURRENT`** (no v4 from stale v2).
- **Ordinary edit concurrency:** line edits mutate the same CURRENT id in place; formalization always reads the latest lines for that id at commit time. There is no optimistic line-level token — two editors can still interleave in-place edits on the same CURRENT version.

## Permissions

| Permission | Use |
| --- | --- |
| `finance.forecast.view` | Preview / read current state |
| `finance.forecast.manage` | Execute formalization |

No new permission keys.

## Automatic forecast independence

Manual formalization does **not**:

- regenerate or mark automatic forecast stale
- adopt projection
- create `FinanceProjectionAdoption`
- set `sourceProjectionVersionId`

**Automatische Prognose übernehmen** (FIN-04B) remains a separate action using the same low-level snapshot primitive with `AUTOMATIC_FORECAST_ADOPTION`.

## FIN-04C-04 scope

History lists, evolution comparisons, and accuracy views are **not** part of 04C-03. This package ensures superseded/current snapshots and metadata are truthful for upcoming query work.

## Actor audit

`createdByUserId` on promoted versions is populated from server auth context when available (existing FIN-04C-02 field). No parallel audit tables were added in 04C-03.
