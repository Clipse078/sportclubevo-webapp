# SCE-DS2-04 — Premium activity cards (White Edition)

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-04` |
| **Scope** | Canonical `Sce*Card` family, programme list shell, semantic activity-card tokens |
| **Dependencies** | `SCE-DS2-01`, `SCE-DS2-02`, `SCE-DS2-03` |
| **Exclusions** | Infoboard signage chrome, DS2-05/06 module sweeps, domain logic |

## Surfaces

| Component | Category marker |
| --- | --- |
| `SceMatchCard` | `MATCH` |
| `SceTrainingCard` | `TRAINING` |
| `SceTournamentCard` | `TOURNAMENT` |
| `SceClubEventCard` | `CLUB_EVENT` |
| `SceProgrammeActivityCardShell` | List wrapper (`data-sce-activity-card`) |

## Tokens & modules

| Item | Location |
| --- | --- |
| Shell contract | `activity-card-shell-contract.ts` |
| Layout roles | `sce-activity-card-layout-contract.ts` |
| Region primitives | `components/design-system/activity-card/` |
| Runtime CSS | `app/globals.css` (`.sce-activity-card-shell`, foreground vars) |
| Semantic foregrounds | `activity-card-semantic-tokens.ts` |

## Visual language

- White-first surfaces when `data-sce-theme="white"` is active (`SCE_WHITE_EDITION`).
- Dark navy cards preserved on default `:root` when White Edition is off.
- Restrained `shadow-sm` on white; existing elevated shadow on dark.
- 2px activity-type accent on shell top edge (pill semantics — not full-surface floods).
- Inter for schedule/location meta; `SceTeamName` for team lines (DS2-03).

## Automated coverage

- `lib/design-system/__tests__/sce-ds2-04-activity-cards.test.ts`
- `sce-ui-rollout-01d`–`01g` sporting-activity suites (regression)
- `npm run test:design-system` governance gate

## Downstream

- `SCE-DS2-05` — dense workspace primitives on white.
- `SCE-DS2-06` — parallel legacy module sweeps.
