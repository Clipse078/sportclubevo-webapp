# SCE-DS2-04 — Premium activity cards (White Edition)

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-04` (runtime; merged as PR **#941** on **2026-11-09**) |
| **Scope** | Canonical `Sce*Card` family, programme list shell, semantic activity-card tokens |
| **Dependencies** | `SCE-DS2-01`, `SCE-DS2-02`, `SCE-DS2-03` (contained on STAGE) |
| **Exclusions** | Infoboard signage chrome, DS2-05/06 module sweeps, domain logic |
| **STAGE merge** | `d58175b4ecfd2fa8d37ee81c023f5310d91492bb` (merge commit) |
| **Feature HEAD** | `c730deeecd53ac2a3be7e0b95bdf618a94f2fe1c` |

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

## Runtime slices (delivered in PR #941)

| Slice | Theme |
| --- | --- |
| **DS2-04R1** | FC Allschwil reference card visual correction (`SceMatchFixtureReferenceLayout`) |
| **DS2-04R2** | Full-width horizontal list cards — see [14-ds2-04r2-full-width-horizontal-cards.md](./14-ds2-04r2-full-width-horizontal-cards.md) |
| **DS2-04R3** | Match preparation accordion collapsed by default |
| **DS2-04R4** | Inline match preparation editing (Spielplanung / matchcenter) |
| **DS2-04R5** | Test and responsive stabilization |

White Edition pilot follow-up for authenticated shell remains **`SCE-DS2-05`** — see [13-ds2-04r1-white-edition-follow-up.md](./13-ds2-04r1-white-edition-follow-up.md) (not implemented in this package).

## Downstream (next package)

**`SCE-DS2-05`** — shared workspace / dense UI primitives on white (`sce-functional-surface-styles.ts`, `SceWorkspaceChrome`). **Do not start DS2-06 module sweeps until DS2-05 lands.**

- `SCE-DS2-06` — parallel legacy module sweeps (after DS2-05).
