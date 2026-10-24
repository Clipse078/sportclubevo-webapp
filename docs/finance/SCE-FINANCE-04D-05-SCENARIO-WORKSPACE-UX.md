# SCE-FINANCE-04D-05 — Scenario workspace UX

| Field | Value |
| --- | --- |
| **Package** | FIN-04D-05 — tenant-facing scenario workspace |
| **Status** | **COMPLETE** — ready for Product Owner UAT |
| **Branch** | `cursor/sce-finance-04d-scenarios-what-if` |
| **Depends on** | FIN-04D-01 … FIN-04D-04 |

## Terminology (locked for 04D-05)

| Concept | German (tenant-facing) |
| --- | --- |
| Workspace area | **Szenarien** |
| User-created object | **Variante** |
| Create CTA | **Neue Variante erstellen** |
| Primary delta label | **gegenüber Ausgangsprognose** |
| Live comparison (secondary) | **Gegenüber heutiger Prognose** |

## Navigation

- Remains under **Finanzen → Prognose** (`/dashboard/finance/forecast`).
- Local sub-context tabs (canonical `SceContextTabs`):
  - **Aktuelle Prognose** → `/dashboard/finance/forecast`
  - **Szenarien** → `/dashboard/finance/forecast/scenarios`
- Detail route: `/dashboard/finance/forecast/scenarios/[scenarioId]` (identity = `FinanceScenario.id`).
- No new top-level Finance nav item.

## Information hierarchy

**Overview:** name + expected result dominate; delta, assumption count, freshness (when outdated), last updated are secondary. Archived excluded by default; **Aktiv / Archiviert** segmented filter (no checkbox).

**Detail (default visible):** identity → expected result → delta vs frozen starting point → freshness exception → top drivers → assumptions.

**Progressive disclosure:** genehmigtes Budget, Kontodetails, Herkunft metadata.

## Create flow

Small dialog: name, optional description/question. Server resolves **aktuelle Prognose**; UI copy: *Basiert auf der aktuellen Prognose.* Zero assumptions allowed. On success → detail route.

## Assumptions

Modal: account (searchable picker), assumption type (segmented — percent / delta / absolute / exclude), values. Basis points stored server-side; UI converts deterministically. Mutations refresh canonical read models via server actions + `revalidatePath`.

## Freshness UX

- `CURRENT`: quiet label only.
- `OUTDATED`: visible non-alarming exception; live current forecast comparison in secondary block.
- `CURRENT_FORECAST_UNAVAILABLE`: primary comparison retained; live block omitted calmly.

## Charts

**None** in v1 — result, delta, drivers, and assumptions answer the management question.

## STAGE migration

Persistence migration `20261024160000_sce_finance_04d_02_scenario_persistence` applied via guarded `scripts/sce-finance-04d-02-stage-migration-verify.ts` (see package final report). No fictional STAGE scenario seed data.

## Binary control compliance

| Field | Value |
| --- | --- |
| NEW_BINARY_CHECKBOXES | 0 |
| CANONICAL_TOGGLES_USED | YES (`SceSegmentedControl` for list filter + assumption kind + forecast create unchanged) |
| MULTI_SELECTION_PATTERN | N/A |

## PO UAT boundary

Automated matrix covers navigation, read models, mutations, permissions architecture, and regression guards. **Michael** performs manual PO UAT on shared STAGE. FIN-04D-06 (adoption/rebase) explicitly out of scope.
