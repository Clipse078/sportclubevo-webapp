# SCE-TOURNAMENT-PLANNER-02D — Predefined Spielplan Templates & Instant Generation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02D` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-02`](./SCE-TOURNAMENT-PLANNER-02.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-02C`](./SCE-TOURNAMENT-PLANNER-02C.md) — **CLOSED / ACCEPTED / MERGED** (PR **#876**) |
| **Status** | **READY FOR PO UAT (R13)** |
| **Next package** | **02E** — Spielplan UX, Outputs & Final Hardening |

## Product invariants (R13 — final creator / Spielplan UX)

| Invariant | Value |
| --- | --- |
| **SPIELPLAN_OPT_IN** | **YES** — toggle **Spielplan erstellen** on Termin; **default OFF** |
| **SIMPLE_TOURNAMENT_WITHOUT_SPIELPLAN** | **VALID** — five-step flow: Termin → Teams → Ressourcen → Publikation → Übersicht |
| **SPIELPLAN_CREATOR_FLOW** | **ON** — eight steps including Turnierformat, Spielfelder, Spielplan |
| **PLAYING_FORMAT_OPTIONAL_BY_DEFAULT** | **YES** — **Nicht festgelegt** valid; no global mandatory Spielart validation |
| **PREDEFINED_TEMPLATES** | **Fast path** when curated catalogue matches; **not** a product participant ceiling |
| **TEMPLATE_FIELD_COUNT** | **Authoritative** for matched full templates — optimiser must not silently change field count |
| **SCHEDULE_ROUND_BREAKS** | **0:N**, **after-round** model; no clock-time user input; no `mainPause` UI |
| **CANONICAL_SCHEDULE** | **Single** TP01/TP02 spine — no parallel schedule/break/fixture-card architecture |
| **SPIELPLAN_FIXTURE_PRESENTATION** | R12/R12.1 — field, optional format, crest above name, VS centred; **no Heim/Auswärts** |
| **ARBITRARY_PRODUCT_PARTICIPANT_MAX** | **NONE** |
| **02D_PACKAGE_CLOSED** | **NO** — PO UAT still required before close |

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

## Tests

R1/R2 PO UAT tests plus `tournament-composer-02d-r3.test.ts` (category resolution, override preservation, inventory, schedule applicability).

## UAT

| Flag | Value |
| --- | --- |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **PO_UAT_REQUIRED** | **YES** |
