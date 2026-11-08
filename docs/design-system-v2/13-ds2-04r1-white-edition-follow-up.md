# SCE-DS2-04R1 — White Edition follow-up (dependent package)

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-05` (proposed) |
| **Baseline** | STAGE after DS2-04R1 visual correction merge |
| **Scope** | Authenticated shell and workspace chrome only — not activity card internals |

## Remaining white-first surfaces

| Surface | Current state | Target |
| --- | --- | --- |
| Application canvas | Partial `data-sce-theme="white"` tokens | Full white canvas on STAGE with feature flag / tenant pilot |
| Tactical blue PNG background | Disabled under white theme | Remove dark-era fallback paths from authenticated layout |
| Dashboard panels | Mixed legacy navy panels | White panels, semantic borders, restrained shadow |
| Calendars | Legacy chrome tints | White grid, navy/slate typography |
| Forms & tables | Hardcoded `--surface-2` pockets | Semantic `--sce-color-surface-*` only |
| Workspace chrome | Sidebar / tabs dark holdovers | White chrome, tenant accent on selection only |
| Tabs / hover / focus | Partial DS2-02 alignment | Complete token sweep per `SCE-DESIGN-SYSTEM.md` |

## Rollout controls

- **STAGE:** enable `SCE_WHITE_EDITION` for FC Allschwil pilot evaluation after DS2-04R1 cards land.
- **PROD:** retain safe defaults until white shell package is signed off.
- **Tenant accent:** semantic `color-mix` on interactive states — no full-surface floods.

## Exclusions (this follow-up package)

- Activity card fixture grammar (delivered in DS2-04R1).
- Domain logic, routing, permissions, scheduling.
- Infoboard signage boundary.
