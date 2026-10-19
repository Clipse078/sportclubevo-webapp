# SCE-TOURNAMENT-PLANNER-02B — Playing Formats & Tournament Pitches

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02B` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-02`](./SCE-TOURNAMENT-PLANNER-02.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-02A`](./SCE-TOURNAMENT-PLANNER-02A.md) — **CLOSED / ACCEPTED / MERGED** |
| **Status** | **OPEN** — PO UAT pending |
| **Branch** | `cursor/sce-tournament-planner-02b-playing-formats-pitches` |
| **STAGE baseline** | `eab2797262074358ccd9b5b1317666d4d197a054` |
| **Next package** | **02C** — Participant Playing Units (**NOT STARTED**) |

## Preflight

| Check | Result |
| --- | --- |
| `START_BRANCH` | `STAGE` |
| `STARTING_HEAD_FULL` | `eab2797262074358ccd9b5b1317666d4d197a054` |
| `ORIGIN_STAGE` | `eab2797262074358ccd9b5b1317666d4d197a054` |
| `02A_BASELINE_CONTAINED` | **YES** |
| `TP01_BASELINE_CONTAINED` | **YES** |
| `FEATURE_BRANCH` | `cursor/sce-tournament-planner-02b-playing-formats-pitches` |

## Product goal

Optional **PlayingFormat** per logical **TournamentPitch** via nullable **`playersPerSide`**. Normal Tournament Planner 01 workflows remain valid with every pitch unspecified.

| Flag | Value |
| --- | --- |
| **PLAYING_FORMAT_OPTIONAL_BY_DEFAULT** | **YES** |
| **PLAYING_FORMAT_REQUIRED_GLOBALLY** | **NO** |
| **UNSPECIFIED_PLAYING_FORMAT_VALID** | **YES** |
| **DEFAULT_PLAYING_FORMAT_ASSIGNED** | **NO** |
| **SILENT_FORMAT_INFERENCE** | **NO** |

## Persistence

| Item | Choice |
| --- | --- |
| **Model** | `TournamentPitch.playersPerSide Int?` |
| **Migration** | `20261019120000_sce_tournament_planner_02b_playing_format` |
| **Backfill** | **None** — existing rows remain unspecified (`NULL`) |
| **Service** | `lib/tournament-scheduling/tournament-pitch-service.ts` |

## Validation

| Constant | Value |
| --- | --- |
| **PLAYERS_PER_SIDE_PRODUCT_MAX** | **(none)** |
| **PLAYERS_PER_SIDE_TECHNICAL_BOUND** | **1–22** |
| **TECHNICAL_BOUND_IS_PRODUCT_RULE** | **NO** |

Defensive integer band only — supports small-sided formats through 11v11 without hard-coded enums. Federation/product caps belong in future presets or format-specific rules (e.g. ROTATION in 02D).

Implementation: `lib/tournament-scheduling/validate-tournament-pitch-playing-format.ts`  
Generic **TournamentPitch** validation only — programme formats that require format must validate in their own package (not in generic pitch rules).

## Presentation

Canonical helpers: `lib/tournament-scheduling/playing-format-presentation.ts`

- Compact: `3v3` (Planung columns, matrix headers)
- Creator / a11y: `3 gegen 3`
- Unspecified Creator copy: **Nicht festgelegt**

## Adoption

| Surface | Status |
| --- | --- |
| **Creator — Spielfelder** | Optional Spielform per pitch |
| **Planung — settings** | Retrospective edit; no schedule mutation |
| **Planung — board/list** | `formatHint` when configured |
| **Spielplan outputs** | Pitch columns carry optional `formatHint` |
| **API** | `PATCH /api/tournaments/:id/pitches/:pitchId`, Planung `PATCH .../planung/pitches/:pitchId` |

## Scheduling semantics (02B)

Changing `playersPerSide` does **not**:

- mutate fixtures (WHO)
- regenerate assignments
- change locks or results

PlayingFormat is metadata for normal TP01 formats until an advanced programme format explicitly uses it as a constraint (02D+).

## Out of scope (later packages)

| Deferred | Package |
| --- | --- |
| `TournamentParticipantUnit` | **02C** |
| ROTATION generator | **02D** |
| `TournamentStation` / in-round phases | **02E / 02F** |

## Tests

- `lib/tournament-scheduling/__tests__/tournament-pitch-playing-format-02b.test.ts`
- `lib/tournaments/__tests__/tournament-planner-02b-roadmap.test.ts`
