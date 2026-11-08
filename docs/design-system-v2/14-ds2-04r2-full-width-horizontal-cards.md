# SCE-DS2-04R2 — Full-width horizontal activity cards

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-04R2` |
| **Baseline** | DS2-04R1 FC Allschwil reference split |
| **Scope** | Canonical list/programme surfaces — one horizontal card per row |

## Contract

| Item | Location |
| --- | --- |
| List container | `activity-card-full-width-list-contract.ts` |
| Match reference split | `activity-card-reference-layout.ts` + `SceMatchFixtureReferenceLayout` |
| Operational rows (training / tournament / club event) | `trainingReferenceRowClass` |
| Programme shell | `SceProgrammeActivityCardShell` |

## Surfaces (R2)

- Team cockpit upcoming + results
- Matchcenter Spielplanung + Resultate day lists
- Programme / Wochenplaner / dashboard agenda (existing shell — grid guard)
- Training / tournament / club event `listRowPresentation="operational"`

## Exclusions

- `SCE-DS2-05` authenticated white shell conversion
- Infoboard signage
- KPI / unrelated admin grids

## Automated coverage

- `lib/design-system/__tests__/sce-ds2-04r2-activity-cards-horizontal.test.ts`
- `sce-ds2-04-activity-cards.test.ts` (R1 regression)
- `sce-ui-rollout-01d`–`01g`
