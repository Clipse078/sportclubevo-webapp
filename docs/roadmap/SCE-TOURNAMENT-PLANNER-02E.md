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
