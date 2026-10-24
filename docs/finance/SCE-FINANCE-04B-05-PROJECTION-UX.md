# SCE-FIN-04B-05 — Prognose workspace SCE projection UX

| Field | Value |
| --- | --- |
| **Package** | FIN-04B-05 |
| **Status** | **IMPLEMENTED / PO UAT REQUIRED** |
| **Route** | `/dashboard/finance/forecast` (tab **Prognose**) |
| **Shared STAGE migration 04B-04** | **APPLIED** (see methodology doc) |

## Canonical terminology

| Concept | German label |
| --- | --- |
| Organisation-owned management expectation | **Aktuelle Prognose** |
| System-generated decision support | **SCE-Projektion** |
| Workspace tab | **Prognose** |
| Confidence (product) | **Prognosesicherheit** |

No adoption action in FIN-04B-05 (`SCE-Projektion übernehmen` → FIN-04B-06).

## Information architecture

Inside **Prognose**:

1. Year / currency context strip (unchanged)
2. **SCE-Projektion** — compact decision-support surface (read-only, generation/refresh when `finance.forecast.manage`)
3. **Aktuelle Prognose** — existing FIN-04A editable forecast (primary)

SCE does not replace or edit the forecast table. Optional SCE columns in the forecast account tables show projection amount and neutral delta (SCE − Prognose).

## Lifecycle

| Action | Permission | Behaviour |
| --- | --- | --- |
| SCE-Projektion erstellen | `finance.forecast.manage` | Calls FIN-04B-04 `generateFinanceYearProjection`; new immutable version |
| SCE-Projektion aktualisieren | `finance.forecast.manage` | New version; prior version superseded |
| View | `finance.forecast.view` | Read-only; no generation controls |

Staleness uses FIN-04B-03 fingerprint semantics (`FRESH` / `STALE`). Opening the workspace does not auto-regenerate.

## Coverage and aggregates

Pure helper: `computeProjectionAggregateCoverage` (`lib/finance/projection/projection-workspace-coverage.ts`).

- Missing `projectedAmountMinor` is **not** treated as zero.
- Summaries label partial income/expense/result when active accounts lack projections.
- Result total is shown only when both income and expense sides are complete for active accounts.

## Presentation states

View-model: `buildProjectionWorkspaceViewModel` — `NO_PROJECTION`, `AVAILABLE_FRESH`, `AVAILABLE_STALE`, `PARTIAL_COVERAGE`, `INSUFFICIENT`, `GENERATION_FAILED` (reserved).

## Methodology labels (primary UI)

| Engine | UI |
| --- | --- |
| `HISTORICAL_PATTERN` | Historischer Verlauf |
| `RUN_RATE` | Aktueller Verlauf |
| `NONE` / version `MIXED` | No per-line method label / mixed version only |

Engine version `sce-projection-v1` is not shown in primary UX.

## Explainability

Per-account info affordance (dialog): method, data basis, historical `FinanceYear.name` list, cutoff, known actual + estimated remainder + projection, optional range, Prognosesicherheit.

## Tests

- `lib/finance/__tests__/finance-04b-05-projection-workspace.test.ts`
- `lib/finance/__tests__/finance-04b-05-generation-action.test.ts`
- FIN-04B-04 orchestrator regression for generation persistence

## Next

**FIN-04B-06** — Projection → Forecast adoption (after PO visual UAT).
