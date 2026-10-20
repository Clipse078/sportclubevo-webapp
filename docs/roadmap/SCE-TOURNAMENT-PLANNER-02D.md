# SCE-TOURNAMENT-PLANNER-02D — Predefined Spielplan Templates & Instant Generation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02D` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-02`](./SCE-TOURNAMENT-PLANNER-02.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-02C`](./SCE-TOURNAMENT-PLANNER-02C.md) — **CLOSED / ACCEPTED / MERGED** (PR **#876**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PO UAT **PASS**, PR **#877**) |
| **PR** | **#877** — merged to **STAGE** |
| **Accepted feature HEAD (R13)** | `c3b9eb9cb074447b8fe28b400524fd36d77fdeaf` |
| **Branch** | `cursor/sce-tournament-planner-02d-predefined-spielplan-templates-017a` |
| **Next package** | **02E** — Spielplan UX, Outputs & Final Hardening (**NOT STARTED**) |

## Product principle (canonical)

**SELECT PARTICIPATING TEAMS → SCE RECOGNISES PARTICIPANT COUNT → SELECTS/OFFERS A PROVEN SPIELPLAN TEMPLATE → MAPS TEAMS → CALCULATES TIMES & PITCHES → SPIELPLAN READY**

| Rule | Value |
| --- | --- |
| **INITIAL_CURATED_RANGE** | **4–16** participants where an approved template exists |
| **ARBITRARY_PRODUCT_PARTICIPANT_MAX** | **NONE** — **16 MUST NOT** become a technical or product maximum |
| **BEYOND_CURATED_CATALOGUE** | Existing **TP01** generic generation path where possible |
| **SILENT_TEMPLATE_INVENTION** | **NO** |

## Product invariants (R13 — final creator / Spielplan UX)

| Invariant | Value |
| --- | --- |
| **SPIELPLAN_OPT_IN** | **YES** — toggle **Spielplan erstellen** on Termin; **default OFF** |
| **SIMPLE_TOURNAMENT_WITHOUT_SPIELPLAN** | **VALID** — five-step flow: Termin → Teams → Ressourcen → Publikation → Übersicht |
| **SPIELPLAN_CREATOR_FLOW** | **ON** — eight steps including Turnierformat, Spielfelder, Spielplan |
| **OFF_WORKFLOW_STEP_COUNT** | **5** |
| **ON_WORKFLOW_STEP_COUNT** | **8** |
| **PLAYING_FORMAT_OPTIONAL_BY_DEFAULT** | **YES** — **Nicht festgelegt** valid; no global mandatory Spielart validation |
| **PLAYING_FORMAT_REQUIRED_GLOBALLY** | **NO** |
| **UNSPECIFIED_PLAYING_FORMAT_VALID** | **YES** |
| **DEFAULT_PLAYING_FORMAT_ASSIGNED** | **NO** |
| **SILENT_FORMAT_INFERENCE** | **NO** |
| **NORMAL_TOURNAMENT_FORMAT_REQUIRED** | **NO** |
| **LEGACY_TOURNAMENT_FORMAT_REQUIRED** | **NO** |
| **SPIELPLAN_GENERATION_WITHOUT_PLAYING_FORMAT** | **PASS** (PO UAT) |
| **PREDEFINED_TEMPLATES** | **Fast path** when curated catalogue matches; **not** a product participant ceiling |
| **TEMPLATE_FIELD_COUNT** | **Authoritative** for matched full templates — optimiser must not silently change field count |
| **SCHEDULE_ROUND_BREAKS** | **0:N**, **after-round** model; no clock-time user input; no `mainPause` UI |
| **BREAK_POSITION_MODEL** | **AFTER_ROUND** |
| **BREAK_CARDINALITY** | **0:N** |
| **CANONICAL_SCHEDULE** | **Single** TP01/TP02 spine — no parallel schedule/break/fixture-card architecture |
| **SPIELPLAN_FIXTURE_PRESENTATION** | R12/R12.1 — field, optional format, crest above name, VS centred; **no Heim/Auswärts** |
| **ARBITRARY_PRODUCT_PARTICIPANT_MAX** | **NONE** |
| **02D_PACKAGE_CLOSED** | **YES** |

## Product principle (R3)

**SCE PROPOSES — THE USER REMAINS IN CONTROL.**

| Flag | Value |
| --- | --- |
| **PROPOSAL_NOT_LOCK** | **YES** |
| **CATEGORY_AWARE_PROPOSAL** | **YES** |
| **USER_EDITABLE_FIELDS** | **YES** |
| **USER_OVERRIDE_PRESERVATION** | **YES** |
| **RESET_TO_RECOMMENDATION** | **YES** (user-initiated) |
| **PLAYING_FORMAT_OPTIONALITY** | **YES** (global 02B rules preserved) |
| **CANONICAL_SCHEDULE_AFTER_CUSTOMISATION** | **YES** (one schedule; TP01 when template incompatible) |
| **SOURCE_TEMPLATE_IMMUTABLE** | **YES** (versioned catalogue never mutated by user edits) |

Curated templates and field proposals seed the **draft** configuration. After materialisation, `TournamentPitch` rows and planner draft pitches are user-editable without mutating catalogue sources.

## Category-aware lookup

| Item | Choice |
| --- | --- |
| **LOOKUP_KEY** | `ProgrammeTemplateLookupKey` — `categoryContext` + `participantCount` + `programmeFamily` + `version` |
| **AUTHORITATIVE_CATEGORY_SOURCE** | Structured tenant `Team.ageGroup` on **TEAM** participants (`normalizeJuniorCategoryCode`) |
| **SILENT_RECOGNITION** | **YES** when all team participants share one resolvable junior code |
| **DISPLAY_NAME_GUESSING** | **NO** |
| **UNKNOWN_CATEGORY_FALLBACK** | Generic / TP01 — no silent E template on unknown category |

## Template architecture

| Item | Choice |
| --- | --- |
| **TEMPLATE_MODEL** | `TournamentProgrammeTemplate` (`lib/tournament-scheduling/programme-templates/types.ts`) |
| **TEMPLATE_STORAGE** | **Code-backed versioned catalogue** (git + tests) |
| **VERSIONED** | **YES** (`id` + `version` + `categoryContext`) |
| **GIANT_COUNT_SWITCH** | **NO** |
| **TEMPLATE_INSTANTIATION_TARGET** | Existing canonical **Tournament Planner** schedule (`TournamentScheduleVersion` spine) |

## Curated catalogue (evidence-based)

| Category | Encoded Spielplan (rounds) | Field-only proposal |
| --- | --- | --- |
| **E/FF12** | Counts **4–8** (`e-ff12-youth-rotation-*`) | — |
| **F** | *Pending approved round matrices in-repo* | Counts **5–12** field counts (3v3/4v4 mix metadata) |
| **G** | *Pending approved reference encode* | *None in-repo* |

| Flag | Value |
| --- | --- |
| **INVENTED_TEMPLATES** | **NO** |
| **E_FF12_CURATED_COUNTS** | **4, 5, 6, 7, 8** |
| **F_CURATED_FIELD_PROPOSAL_COUNTS** | **5–12** (fields only until Spielplan encode lands) |
| **G_CURATED_COUNTS** | **none in-repo** |
| **NO_TEMPLATE_FALLBACK** | **YES** — existing TP01 generator path |

Reference inventory (maintainer/tests): `buildProgrammeReferenceInventory()`.

## Composer UX (R3)

| Step | Behaviour |
| --- | --- |
| **Turnierformat** | “Empfohlener Spielplan” / proposal language — not locked requirements |
| **Spielfelder** | Editable cards; add / delete / rename / format / reorder; **Empfehlung wiederherstellen** when customised |
| **Material upstream change** | Prompt: **Empfehlung übernehmen** / **Eigene Aufteilung behalten** — no silent overwrite |

## Instantiation & persistence

When the user keeps a compatible customised layout, `applyProgrammeTemplateToTournament` accepts **pitch overrides** keyed by `templateFieldKey`. Incompatible layouts fall back to TP01 with composer pitch rows.

Template instantiation resolves into the existing canonical Tournament Planner schedule — **no** parallel tournament schedule model.

## Integrity boundaries (closure audit)

| Forbidden introduction | Present in 02D |
| --- | --- |
| Generic Activity DB model | **NO** |
| Parallel tournament schedule | **NO** |
| Second participant-unit model | **NO** (`TournamentParticipantUnit` from 02C only) |
| Second tournament-pitch model | **NO** |
| Tournament-specific crest database | **NO** |
| Mandatory PlayingFormat | **NO** |
| Silent PlayingFormat inference | **NO** |
| 16-participant product ceiling | **NO** |
| Fake fixtures for pauses | **NO** |
| Wall-clock pause configuration in creator | **NO** |
| Second Match Card architecture | **NO** |
| External reference branding in SCE | **NO** |
| New binary checkbox controls | **NO** |
| Password/credential mutation | **NO** |
| Persistent UAT/test records | **NO** |

## Tests

R1–R13 automated regression (composer, catalogue, create-form, crest, breaks, optional Spielplan) plus `tournament-composer-02d-r3.test.ts` and roadmap guardrails.

## UAT

| Flag | Value |
| --- | --- |
| **PO_UAT** | **PASS** |
| **OPTIONAL_SPIELPLAN_DEFAULT_OFF** | **PASS** |
| **OFF_WORKFLOW_STEP_COUNT** | **5** |
| **ON_WORKFLOW_STEP_COUNT** | **8** |
| **PLAYING_FORMAT_OPTIONAL_BY_DEFAULT** | **YES** |
| **PLAYING_FORMAT_REQUIRED_GLOBALLY** | **NO** |
| **UNSPECIFIED_PLAYING_FORMAT_VALID** | **YES** |
| **DEFAULT_PLAYING_FORMAT_ASSIGNED** | **NO** |
| **SILENT_FORMAT_INFERENCE** | **NO** |
| **NORMAL_TOURNAMENT_FORMAT_REQUIRED** | **NO** |
| **LEGACY_TOURNAMENT_FORMAT_REQUIRED** | **NO** |
| **SPIELPLAN_GENERATION_WITHOUT_PLAYING_FORMAT** | **PASS** |
| **MULTI_ROUND_BREAKS** | **PASS** |
| **BREAK_POSITION_MODEL** | **AFTER_ROUND** |
| **BREAK_CARDINALITY** | **0:N** |
| **R12_FIXTURE_CARD_PRESENTATION** | **PASS** |
| **R12_1_CANONICAL_CREST_RESOLUTION** | **PASS** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

## Design system

| Flag | Value |
| --- | --- |
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** |
| **WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE** | **PASS** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES** | **0** |
| **CANONICAL_TOGGLES_USED** | **YES** |
| **PARALLEL_MATCH_CARD_PATTERN_INTRODUCED** | **NO** |

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
| **DATABASE_MIGRATION_REQUIRED_AT_CLOSURE** | **NO** (additive migration `20261019160000_sce_tournament_planner_02d_programme_templates` already in PR; **PROD** untouched at closure) |
| **STAGE_VERIFY_SCRIPT** | `scripts/sce-tournament-planner-02d-stage-migration-verify.ts` |

## Verification (02D closure)

Regression gate recorded in PR **#877**: programme template catalogue/integrity, approved reference templates, slot mapping, `TournamentParticipantUnit` / `TournamentPitch` integration, optional PlayingFormat, template-authoritative field counts, TP01 fallback, optional Spielplan OFF/ON, R11 after-round pauses, R12 fixture cards, R12.1 crest resolution, R13 UX invariants, relevant TP01 / activity-create composer regression. `prisma validate`, `prisma generate`, production build (`NODE_OPTIONS=--max-old-space-size=8192`) — **PASS** at closure.
