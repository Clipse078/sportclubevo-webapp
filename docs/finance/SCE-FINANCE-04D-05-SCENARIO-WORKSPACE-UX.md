# SCE-FINANCE-04D-05 — Scenario workspace UX

| Field | Value |
| --- | --- |
| **Package** | FIN-04D-05 — tenant-facing scenario workspace |
| **Status** | **COMPLETE** — **04D-05R1 COMPLETE** — **Product Owner UAT PASS** (visual + non-empty scenario) — governance actions in **04D-06** (PO UAT PASS); **FIN-04D READY FOR MERGE** |
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

### Detail composition (04D-05R1 — PO UAT correction)

**Before (04D-05):** result hero, then shallow disconnected section strips and loose **Details anzeigen** links on the ambient background.

**After (04D-05R1):** three intentional layers on the Scenario detail body:

1. **Decision summary** — dark result hero (variant identity, baseline context, expected result, delta vs Ausgangsprognose, overflow menu). Expected result stays primary; zero delta is visually quiet.
2. **Decision explanation** — desktop two-column grid (~55–60% drivers / ~40–45% assumptions), stacked on narrow viewports. Padded Finance section surfaces with deliberate empty states when there are no assumptions (first-use guidance without duplicate CTAs).
3. **Investigation** — one shared secondary surface (**Weitere Details**) with row-style disclosures for genehmigtes Budget, Kontodetails, and Herkunft (title + summary + chevron; no repeated standalone **Details anzeigen** in the collapsed row).

**Charts:** still none in v1.

**Responsive:** explanation columns collapse vertically; investigation rows stay full width; no page-level horizontal overflow architecture change.

## Create flow

Small dialog: name, optional description/question. Server resolves **aktuelle Prognose**; UI copy: *Basiert auf der aktuellen Prognose.* Zero assumptions allowed. On success → detail route.

## Assumptions

Modal: account (searchable picker), assumption type (segmented — percent / delta / absolute / exclude), values. Basis points stored server-side; UI converts deterministically. Mutations refresh canonical read models via server actions + `revalidatePath`.

Assumptions are **annual full-year** account changes only (see [`SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md`](./SCE-FINANCE-FORECAST-TIMING-AND-EFFECTIVE-DATES.md)). **No Ab Datum / effective-date fields** in v1 — adding dates without temporal engine semantics would imply false precision.

### PO UAT evidence (non-authoritative illustration)

Non-empty scenario validated with **Mitgliedsbeiträge −10%**: baseline ≈ 236'327, contribution ≈ −23'633, scenario result ≈ 161'533 (display rounding). Stored minor units and engine output remain authoritative — do not hardcode these figures in product code.

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

## PO UAT status

| Check | Result |
| --- | --- |
| Visual UAT (04D-05R1 hierarchy) | **PASS** |
| Non-empty scenario UAT (e.g. Mitgliedsbeiträge −10%) | **PASS** |
| Implementation | **COMPLETE** |

Automated matrix covers navigation, read models, mutations, permissions architecture, and regression guards. FIN-04D-06 (adoption/rebase) is **next** and remains out of scope for 04D-05.
