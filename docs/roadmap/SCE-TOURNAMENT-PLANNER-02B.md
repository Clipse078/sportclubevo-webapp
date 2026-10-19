# SCE-TOURNAMENT-PLANNER-02B — Playing Formats & Tournament Pitches

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02B` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-02`](./SCE-TOURNAMENT-PLANNER-02.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-02A`](./SCE-TOURNAMENT-PLANNER-02A.md) — **CLOSED / ACCEPTED / MERGED** |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PO UAT **PASS**, R4 visual PO UAT **PASS**, PR **#875**) |
| **PR** | **#875** — merged to **STAGE** |
| **Accepted feature HEAD (R4)** | `bdb466f10e5bdfc0efb3e3a84808c2e5a0a8336b` |
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

## STAGE deployment (required before 02B app code)

02B Prisma client **selects** `TournamentPitch.playersPerSide`. If the app is deployed without migration `20261019120000_sce_tournament_planner_02b_playing_format`, tournament **edit** fails server-side (`P2022` column not found) when `loadTournamentPlanungViewModel` runs.

Apply on designated STAGE only:

```bash
APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  ./node_modules/.bin/tsx scripts/sce-tournament-planner-02b-stage-migration-verify.ts --apply
```

Verify:

```bash
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  ./node_modules/.bin/tsx scripts/sce-tournament-planner-02b-stage-migration-verify.ts
```

## Tests

- `lib/tournament-scheduling/__tests__/tournament-pitch-playing-format-02b.test.ts`
- `lib/tournaments/__tests__/tournament-planner-02b-roadmap.test.ts`
- `lib/tournaments/__tests__/tournament-edit-page-02b-migration-regression.test.ts`

## STAGE schema-drift incident (resolved)

| Item | Detail |
| --- | --- |
| **Symptom** | Tournament **Edit → Planung** preload failed with Prisma **P2022** (`ColumnNotFound`) |
| **Root cause** | Application code selected `TournamentPitch.playersPerSide` before additive migration `20261019120000_sce_tournament_planner_02b_playing_format` was applied on designated **STAGE** |
| **Fix** | Apply/verify migration on STAGE (`scripts/sce-tournament-planner-02b-stage-migration-verify.ts`); **not** a legacy tournament data defect |
| **Lesson** | **Migration / schema verification → application code expecting new column** |
| **P2022 suppression** | **NO** |

## UAT

| Flag | Value |
| --- | --- |
| **02B_FUNCTIONAL_PO_UAT** | **PASS** |
| **R4_VISUAL_PO_UAT** | **PASS** |
| **PO_UAT_STATUS** | **PASS** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

## Match card (R4)

Tournament **Feld- und Zeitplan** fixture cells use the shared canonical primitive **`SceMatchStackedFixtureIdentity`** inside **`SceMatchCard`** — home left, away right, centred VS, canonical crests, compact tournament density. No redundant type/status/date/time/venue/pitch/format badges inside each fixture card.

| Flag | Value |
| --- | --- |
| **CANONICAL_MATCH_PRIMITIVE_REUSED** | **YES** |
| **PARALLEL_MATCH_CARD_CREATED** | **NO** |
| **WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE** | **PASS** |

## Security

| Flag | Value |
| --- | --- |
| **PASSWORD_MUTATION** | **NO** |
| **PASSWORD_HASH_WRITE** | **NO** |
| **CREDENTIAL_SCRIPT_EXECUTED** | **NO** |

## Verification (02B delivery)

Run Tournament Planner regression gate plus 02B tests — recorded in PR **#875** closure.
