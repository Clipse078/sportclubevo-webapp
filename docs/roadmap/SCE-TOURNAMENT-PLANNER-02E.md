# SCE-TOURNAMENT-PLANNER-02E — Unified Spielplan UX, Outputs & Final Hardening

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02E` |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-02D`](./SCE-TOURNAMENT-PLANNER-02D.md) — **CLOSED / ACCEPTED / MERGED** (PR **#877**) |
| **Status** | **READY FOR PO UAT** (not closed until PO sign-off) |
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

## Playing format

Optional label (`3v3`, …) only when `playersPerSide` is set; no “Nicht festgelegt” in cards.

## Breaks

Unchanged R11 model; breaks use `SceTournamentScheduleBreakPresentation`, not match cards.

## Outputs

Print/PDF/share remain derived from canonical Spielplan view models (01K); no parallel schedule truth.

## Responsive & accessibility

- One responsive presentation architecture (grid scroll, single-column composer on mobile preserved)
- Stacked identity + `aria-label` / accessible matchup labels
- VS `aria-hidden` where label covers relationship

## Regression

See package PR — targeted component tests for unified presentation adoption plus existing 02D / planung / composer suites.

## PO UAT

Cursor did **not** perform manual visual UAT or screenshots. PO validates the 18 targets listed in the 02E prompt.

## Design system

- SCE surface + match-card shell tokens (`sce-tournament-surface-layout`)
- Canonical toggles unchanged; **no new binary checkboxes**

## 02E-R1 — World-class unified Spielplan card family (PO refinement)

| Field | Value |
| --- | --- |
| **Trigger** | PO visual review before 02E sign-off |
| **Reference** | Target Spielplan-Ausgabe mock (visual inspiration only) |
| **Status** | **READY FOR PO UAT** (02E remains open until PO accepts R1) |

### Non-negotiable fixture anatomy

Participant zones remain **crest above name** (stacked), symmetrical around a centred VS:

```
[ PARTICIPANT A ]  [ VS ]  [ PARTICIPANT B ]
     CREST                    CREST
      NAME                     NAME
```

Do **not** adopt horizontal crest–name rows from the reference image.

### R1 presentation upgrades

| Area | Change |
| --- | --- |
| **VS** | `SceTournamentFixtureVs` — one subtle capsule treatment; density-scaled (standard / compact / grid) |
| **Densities** | Standard → `STANDARD` match identity + ~48px planner crest; compact → ~40px management; grid → ~32px compact |
| **Surfaces** | Distinct standard vs compact fixture shells; restrained borders and hover on non-embedded cards |
| **Rounds** | `SceTournamentRoundHeader` shared by Composer preview and Master-Spielplan |
| **Metadata** | Field + optional playing format on fixture; time owned by round (Master/Composer); grid omits field/time |
| **Master** | Explicit `compact` density on fixture cards |

### Compliance (R1)

- **`WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE`** — one SCE tournament fixture family, purpose-built densities
- **`PARALLEL_MATCH_CARD_PATTERN_INTRODUCED = NO`**
- **`CREST_ABOVE_NAME_PRESERVED = YES`**
- Cursor **did not** run manual browser UAT or screenshots for R1; PO performs visual UAT

## 02E-R2 — Final visual density & grid polish

| Field | Value |
| --- | --- |
| **Trigger** | PO visual UAT of R1 — Composer/Master accepted; Feld- und Zeitplan grid density needs final polish |
| **Status** | **FINAL VISUAL DENSITY & GRID POLISH — READY FOR PO UAT** |

### Scope (restrained)

| Surface | R2 action |
| --- | --- |
| **Composer (`standard`)** | **No visual regression** — shared-token fixes only if neutral |
| **Master-Spielplan (`compact`)** | **No visual regression** |
| **Feld- und Zeitplan (`grid`)** | Crest-forward grid cells: `board` crest tier (~36px), grid name typography, VS capsule readability, minimal vertical breathing room, column `minmax` tuned for 2–3 pitches |

### Grid density tokens

- **`crestVisualSizeOverrideForFixturePresentation('grid')` → `board`** (between legacy `compact` 32px and Master `management` 40px)
- **`stackedLayoutScaleForFixturePresentation('grid')`** — spacing rhythm for matrix cells
- **`clubNameClassForFixturePresentation('grid')`** — clamped semibold names under crests
- **`SceTournamentFixtureVs`** — grid capsule padding/contrast refined; still one primitive

### Compliance (R2)

- **`PARALLEL_MATCH_CARD_PATTERN_INTRODUCED = NO`**
- **`COMPOSER_VISUAL_REGRESSION = NONE`**
- **`MASTER_VISUAL_REGRESSION = NONE`**
- Cursor **did not** run manual visual UAT or screenshots for R2; PO performs visual UAT
