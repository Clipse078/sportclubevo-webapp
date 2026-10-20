# SCE-TOURNAMENT-PLANNER-02E — Unified Spielplan UX, Outputs & Final Hardening

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02E` |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-02D`](./SCE-TOURNAMENT-PLANNER-02D.md) — **CLOSED / ACCEPTED / MERGED** (PR **#877**) |
| **Status** | **CLOSED / ACCEPTED / pending merge** (PO UAT **PASS**, PR **#878**) |
| **Branch** | `cursor/sce-tournament-planner-02e-unified-spielplan-ux-ebf3` |

## Objective

Final TP02 package: unify Spielplan **visual composition** across Composer, Planung Master-Spielplan, and Feld- und Zeitplan while preserving **one canonical schedule**, template engine (02D), optional Spielplan (R10), breaks (R11), crest rules (R12.1), and playing-format optionality.

## Initial visual divergence (audit)

| Surface | Before 02E | Primary issue |
| --- | --- | --- |
| Composer Spielplan preview | `SceTournamentSpielplanPreviewFixtureCard` + stacked `SceMatchStackedFixtureIdentity` | Accepted R12 direction |
| Planung Master-Spielplan | `SceTournamentFixtureCard` horizontal crest/name row + left time column | Felt like legacy fixture row, not match-card family |
| Planung Feld- und Zeitplan | Mixed: board used stacked identity; schedule list used **inline** horizontal identity | Three visible dialects |
| Shared low-level pieces | `SceTournamentFixtureIdentity`, `ClubCrest`, surface tokens | Architecture shared; **composition** did not |

## Canonical presentation decision

Introduced **`SceTournamentFixturePresentation`** as the tournament fixture presentation layer with densities:

| Density | Use |
| --- | --- |
| **standard** | Composer Spielplan preview cards |
| **compact** | Master/team Spielplan cards (with optional time), Planung round lists, mobile planung |
| **grid** | Feld- und Zeitplan cells (embedded in DnD control) |

| Flag | Value |
| --- | --- |
| **STANDARD_USES_CANONICAL_PRESENTATION** | **YES** |
| **COMPACT_USES_CANONICAL_PRESENTATION** | **YES** |
| **GRID_USES_CANONICAL_PRESENTATION** | **YES** |
| **CREST_ABOVE_NAME_PRESERVED** | **YES** |

Match identity always flows through **`SceMatchStackedFixtureIdentity`** (via `SceTournamentFixtureCompactMatchup` layouts `spielplan` / `board`). `inline` and `stack` layouts are aliases to the same stacked grammar for backwards compatibility.

**`PARALLEL_MATCH_CARD_PATTERN_INTRODUCED = NO`**

## Adoption map

| Surface | Component |
| --- | --- |
| Composer → Spielplan | `SceTournamentSpielplanPreviewFixtureCard` → `SceTournamentFixturePresentation` (`standard`) |
| Master / Team Spielplan | `SceTournamentFixtureCard` → `SceTournamentFixturePresentation` (`standard`/`compact`); master omits per-fixture time when round header carries kickoff |
| Planung schedule sections | `TournamentPlanungScheduleList` → `compact` + canonical breaks |
| Feld- und Zeitplan board | `TournamentPlanungBoard` → `grid` embedded presentation |
| Planung mobile timeline | `compact` embedded |

## Crest rules (unchanged)

- Canonical `ClubCrest` / `participantIdentityFromPlanung` / composer participant presentation
- `object-contain`, transparent background, no tournament-specific resolver
- **`TOURNAMENT_SPECIFIC_CREST_RESOLVER_INTRODUCED = NO`**
- **`CREST_ASPECT_RATIO_PRESERVED = YES`**

## Canonical VS

One primitive: **`SceTournamentFixtureVs`** — restrained capsule, density-aware, uppercase VS, subordinate to club identity.

| Flag | Value |
| --- | --- |
| **ONE_CANONICAL_VS_PRIMITIVE** | **YES** |

## Playing format

Optional label (`3v3`, …) only when `playersPerSide` is set; no “Nicht festgelegt” in cards.

## Breaks

Unchanged R11 model; breaks use `SceTournamentScheduleBreakPresentation`, not match cards.

| Flag | Value |
| --- | --- |
| **BREAK_CARDINALITY** | **0:N** |
| **BREAK_POSITION_MODEL** | **AFTER_ROUND** |
| **BREAK_IS_FIXTURE** | **NO** |

## Grid / matrix (Feld- und Zeitplan)

| Flag | Value |
| --- | --- |
| **GRID_TIME_OWNERSHIP** | **MATRIX_ROW** |
| **GRID_FIELD_OWNERSHIP** | **MATRIX_COLUMN** |
| **DND_PRESERVED** | **YES** |
| **LOCKS_PRESERVED** | **YES** |
| **CONFLICT_VALIDATION_PRESERVED** | **YES** |
| **HORIZONTAL_SCROLL_FOR_MANY_PITCHES** | **YES** (PO accepted) |
| **BREAK_ROWS_PRESERVED** | **YES** |

Purpose-built **grid** density is intentionally smaller than **standard** (Composer) and **compact** (Master); uniform family ≠ identical dimensions.

## Outputs

Print/PDF/share remain derived from canonical Spielplan view models (01K); no parallel schedule truth.

| Flag | Value |
| --- | --- |
| **PARALLEL_SCHEDULE_TRUTH_CREATED** | **NO** |
| **CANONICAL_SCHEDULE** | **YES** |

## Responsive & accessibility

- One responsive presentation architecture (grid scroll, single-column composer on mobile preserved)
- Stacked identity + `aria-label` / accessible matchup labels
- VS `aria-hidden` where label covers relationship

## Design system

| Flag | Value |
| --- | --- |
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** |
| **WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE** | **PASS** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES** | **0** |
| **CANONICAL_TOGGLES_USED** | **YES** |
| **PARALLEL_MATCH_CARD_PATTERN_INTRODUCED** | **NO** |

## 02E-R1 — World-class unified Spielplan card family

| Field | Value |
| --- | --- |
| **Scope** | World-class unified Spielplan fixture-card family |
| **Status** | **CLOSED / ACCEPTED** (PO UAT **PASS**, ~9/10 Composer) |

### Non-negotiable fixture anatomy

Participant zones remain **crest above name** (stacked), symmetrical around a centred VS:

```
[ PARTICIPANT A ]  [ VS ]  [ PARTICIPANT B ]
     CREST                    CREST
      NAME                     NAME
```

### R1 presentation upgrades

| Area | Change |
| --- | --- |
| **VS** | `SceTournamentFixtureVs` — one subtle capsule treatment; density-scaled (standard / compact / grid) |
| **Densities** | Standard → `STANDARD` match identity + ~48px planner crest; compact → ~40px management; grid → board-tier crest in R2 |
| **Surfaces** | Distinct standard vs compact fixture shells; restrained borders and hover on non-embedded cards |
| **Rounds** | `SceTournamentRoundHeader` shared by Composer preview and Master-Spielplan |
| **Metadata** | Field + optional playing format on fixture; time owned by round (Master/Composer); grid omits field/time |
| **Master** | Explicit `compact` density on fixture cards |

## 02E-R2 — Final visual density & grid polish

| Field | Value |
| --- | --- |
| **Scope** | Final visual density / Feld-und-Zeitplan grid polish |
| **Status** | **CLOSED / ACCEPTED** (PO UAT **PASS**, ~8/10 Feld- und Zeitplan) |

### Scope (restrained)

| Surface | R2 action |
| --- | --- |
| **Composer (`standard`)** | **No visual regression** — shared-token fixes only if neutral |
| **Master-Spielplan (`compact`)** | **No visual regression** (~8.5/10 PO) |
| **Feld- und Zeitplan (`grid`)** | Crest-forward grid cells: board crest tier, grid name typography, VS capsule readability, column `minmax` tuned for 2–3 pitches |

## PO UAT (authoritative)

| Flag | Value |
| --- | --- |
| **PO_UAT** | **PASS** |
| **02E_STATUS** | **CLOSED / ACCEPTED / pending merge** (until PR **#878** merges to **STAGE**) |
| **02E_PACKAGE_CLOSED** | **YES** |
| **COMPOSER_SPIELPLAN** | **PASS** (~9/10) |
| **MASTER_SPIELPLAN** | **PASS** (~8.5/10) |
| **FELD_UND_ZEITPLAN** | **PASS** (~8/10) |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

PO decision: do **not** enlarge GRID cells to match Composer/Master physical size — **standard** / **compact** / **grid** are purpose-built densities within one SCE fixture family.

## Security

| Flag | Value |
| --- | --- |
| **PASSWORD_MUTATION** | **NO** |
| **PASSWORD_HASH_WRITE** | **NO** |
| **PASSWORD_CHANGED_AT_WRITE** | **NO** |
| **CREDENTIAL_RESTORE** | **NO** |
| **CREDENTIAL_SCRIPT_EXECUTED** | **NO** |
| **PERSISTENT_TEST_DATA** | **0** |

## Database (closure)

| Flag | Value |
| --- | --- |
| **DATABASE_MIGRATION_REQUIRED** | **NO** |
| **SCHEMA_DRIFT** | **NO** |
| **PROD** | **UNTOUCHED** |

## Verification (02E closure)

Regression gate: TP02 component/planung/composer suites, fixture presentation densities, crest/VS/break/grid contracts, roadmap guardrails. `prisma validate`, `prisma generate`, production build — **PASS** at closure (PR **#878**).
