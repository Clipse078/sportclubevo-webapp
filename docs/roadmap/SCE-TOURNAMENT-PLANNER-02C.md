# SCE-TOURNAMENT-PLANNER-02C — Participant Playing Units

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02C` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-02`](./SCE-TOURNAMENT-PLANNER-02.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-02B`](./SCE-TOURNAMENT-PLANNER-02B.md) — **CLOSED / ACCEPTED / MERGED** |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PO UAT **PASS**, PR **#876**) |
| **PR** | **#876** — merged to **STAGE** |
| **Accepted feature HEAD (R2)** | `e57c20119a5394853b9529e2381af21d72d607fb` |
| **Branch** | `cursor/sce-tournament-planner-02c-participant-playing-units` |
| **STAGE baseline** | `541626211eff20d2b3274897f2919fe0af5849cf` |
| **Next package** | **02D** — Predefined Spielplan Templates & Instant Generation (**NOT STARTED**) |
| **Final TP02 package** | **02E** — Spielplan UX, Outputs & Final Hardening |

## Preflight

| Check | Result |
| --- | --- |
| `START_BRANCH` | `cursor/sce-tournament-planner-02c-participant-playing-units` |
| `STARTING_HEAD_FULL` | `541626211eff20d2b3274897f2919fe0af5849cf` |
| `FINAL_FEATURE_HEAD_FULL` | `e57c20119a5394853b9529e2381af21d72d607fb` |
| `02B_BASELINE_CONTAINED` | **YES** |
| `R1_ROADMAP_ALIGNMENT_CONTAINED` | **YES** (`810a5057754d3eb93f0afc3c30dbf9b81c94a4a3`) |
| `R2_UAT_FIX_CONTAINED` | **YES** (`e57c20119a5394853b9529e2381af21d72d607fb`) |

## Product goal

Introduce **tournament-local Spielteams** (`TournamentParticipantUnit`) distinct from registered **`TournamentParticipant`**. A club may register once (e.g. FC Allschwil Junioren E1) and appear on the field as E1, E1-1, E1-2 depending on programme configuration — **without** renaming or splitting the underlying SCE `Team`.

Playing units remain the foundation for **predefined Spielplan templates** that reference split tournament-local teams (e.g. template positions **A1** / **A2**) without creating separate SCE `Team` rows.

| Flag | Value |
| --- | --- |
| **PARTICIPANT_NEQ_PLAYING_UNIT** | **YES** |
| **PLAYING_UNIT_TOURNAMENT_LOCAL** | **YES** |
| **SOURCE_TEAM_MUTATED** | **NO** |
| **EXISTING_TOURNAMENTS_REQUIRE_UNIT_SETUP** | **NO** |
| **FULL_UNIT_CONSUMES_PARENT_CAPACITY** | **YES** |
| **FULL_AND_SUBUNIT_SIMULTANEOUS_VALID** | **NO** |
| **DISTINCT_SUBUNITS_SIMULTANEOUS_VALID** | **YES** |
| **DISPLAY_NAME_DETERMINES_CAPACITY** | **NO** |
| **ARBITRARY_MAX_SUBUNITS** | **NONE** |
| **GENERIC_ROTATION_GENERATOR_REQUIRED** | **NO** |
| **STATIONS_ALTERNATIVE_ACTIVITIES_REQUIRED** | **NO** |
| **ADVANCED_TIMING_IN_ROUND_PHASES_REQUIRED** | **NO** |
| **FAIR_PROGRAMME_OPTIMISER_REQUIRED** | **NO** |
| **ROTATION_GENERATOR_IMPLEMENTED** | **NO** |
| **TOURNAMENT_STATIONS_IMPLEMENTED** | **NO** |
| **IN_ROUND_PHASES_IMPLEMENTED** | **NO** |
| **ADVANCED_FAIRNESS_OPTIMISER_IMPLEMENTED** | **NO** |

## Domain model

```
Tournament
  └── TournamentParticipant (registration)
        └── TournamentParticipantUnit[] (Spielteams)
```

| Field / concept | Semantics |
| --- | --- |
| **mode `FULL`** | Consumes entire parent participant capacity |
| **mode `SUBUNIT`** | Partitioned capacity; distinct subunits may play simultaneously |
| **displayName** | Tournament-local label only — never mutates `Team.name` |
| **capacityPartitionKey** | Optional; default partition = unit id (disjoint subunits) |

Capacity overlap primitive: `doParticipantUnitsOverlapCapacity` in `lib/tournament-scheduling/participant-unit-capacity.ts`.

| Rule | Overlap |
| --- | --- |
| Same unit id | YES |
| Same participant, one FULL | YES vs any SUBUNIT |
| Same participant, two SUBUNITs (default partitions) | NO |
| Different participants | NO |

## Compatibility strategy

**IMPLICIT_FULL_TEAM_COMPATIBILITY**: When a participant has **zero** persisted playing units, domain services expose a **synthetic implicit FULL** unit (`implicit-full:{participantId}`) so Round Robin, Smart Mix, Groups, Knockout, and Group→KO continue using **`TournamentParticipant`** fixture sides without manual setup.

When the organiser explicitly configures Spielteams (persisted rows), only those units are listed; fixture/assignment **playing-unit references and predefined template instantiation remain deferred to 02D**.

| Flag | Value |
| --- | --- |
| **BACKFILL_REQUIRED** | **NO** |
| **REAL_FCA_DATA_MUTATED** | **NO** |

## Persistence

| Item | Choice |
| --- | --- |
| **Model** | `TournamentParticipantUnit` |
| **Migration** | `20261019140000_sce_tournament_planner_02c_participant_playing_units` |
| **Lifecycle** | `onDelete: Cascade` from `TournamentParticipant` |
| **Service** | `lib/tournament-scheduling/tournament-participant-unit-service.ts` |

## Playing format (02B preserved)

| Flag | Value |
| --- | --- |
| **PLAYING_FORMAT_REQUIRED_FOR_UNIT** | **NO** |
| **02B_OPTIONALITY_PRESERVED** | **YES** |
| **SILENT_FORMAT_INFERENCE** | **NO** |

## Programme integration

Conceptual pipeline (stations **not** required for remaining TP02 delivery):

**PARTICIPANTS → PLAYING FORMATS → PLAYING UNITS → ROUNDS → ASSIGNMENTS → PITCHES → TIMING → SPIELPLAN**

| Flag | Value |
| --- | --- |
| **PARALLEL_SCHEDULE_TRUTH_CREATED** | **NO** |
| **PLAYING_UNIT_FIXTURE_REFERENCE_IMPLEMENTED** | **NO** |
| **PLAYING_UNIT_ASSIGNMENT_REFERENCE_IMPLEMENTED** | **NO** |
| **DEFERRED_TO_02D** | Template mapping, fixture/assignment playing-unit ids, predefined programme structure |

## 02D template compatibility (preparation only)

02C does **not** implement the template engine or reference Spielpläne. It remains compatible with future template rows such as:

- template position **A** → effective full unit **A**
- split units **A1** / **A2** on the same parent participant

Do **not** hard-code participant-count programmes in 02C — **02D** owns predefined templates.

## Results / rankings

**EXISTING_RESULTS_SEMANTICS_PRESERVED** = **YES**

**UNIT_RESULT_AGGREGATION_DECIDED** = **NO** — deferred; results remain on `TournamentParticipant` / existing fixture model until an approved template or later package requires aggregation.

## UI adoption

Planung / participant editor (`TournamentParticipantsEditor` expanded panel):

- Default: implicit ganzes Team — no extra UI for normal tournaments
- **Team aufteilen** → creates two Teilteams
- **Spielteam hinzufügen** → additional Teilteams
- Rename/remove persisted Spielteams

| Term | Value |
| --- | --- |
| **DOMAIN_TERM** | `TournamentParticipantUnit` / PlayingUnit |
| **USER_FACING_GERMAN_TERM** | **Spielteam**, **Ganzes Team**, **Teilteam**, **Team aufteilen** |

| Flag | Value |
| --- | --- |
| **NEW_BINARY_CHECKBOXES** | **0** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |

## Deployment order

1. **MIGRATION** — apply `20261019140000_sce_tournament_planner_02c_participant_playing_units`
2. **SCHEMA VERIFICATION** — `prisma validate`, `prisma generate`, STAGE script `scripts/sce-tournament-planner-02c-stage-migration-verify.ts`
3. **APPLICATION CODE**

### R2 UAT (Spielteams load / Team aufteilen)

| Symptom | Typical cause | Fix |
| --- | --- | --- |
| «Spielteams konnten nicht geladen werden» on Teilnahme | 02C migration not applied on STAGE (`TournamentParticipantUnit` missing) | Run guarded STAGE apply via `scripts/sce-tournament-planner-02c-stage-migration-verify.ts --apply` (not `db push`) |
| «Team aufteilen» appears inert after failed load | Mutation succeeded but UI refetch hid panel / no optimistic reconcile | R2 panel applies split response immediately + separate load/mutation errors |

**STAGE apply (canonical):**

`APP_ENV=stage NODE_ENV=production SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 ./node_modules/.bin/tsx scripts/sce-tournament-planner-02c-stage-migration-verify.ts --apply`

## UAT

| Flag | Value |
| --- | --- |
| **PO_UAT** | **PASS** (canonical STAGE — Test Turnier II → Teilnahme → FC Allschwil Junioren E1 → Spielteams) |
| **SPIELTEAMS_LOAD** | **PASS** |
| **TEAM_AUFTEILEN** | **PASS** |
| **SPLIT_UNITS_VISIBLE** | **PASS** (E1-Rot / E1-Blau Teilteams) |
| **ADDITIONAL_SPIELTEAM_SUPPORTED** | **PASS** |
| **SOURCE_TEAM_UNCHANGED** | **PASS** |
| **PLAYING_UNITS_PERSISTED** | **YES** (PO session; STAGE `TournamentParticipantUnit` table operational) |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

## 02D handover (canonical principle)

**PARTICIPATING TEAMS → PARTICIPANT COUNT → PREDEFINED SPIELPLAN TEMPLATE → PREDEFINED NUMBER OF FELDER → PREDEFINED ROUNDS / PAIRINGS / FIELD ASSIGNMENTS → MAP REAL TOURNAMENT PARTICIPANTS TO TEMPLATE POSITIONS → APPLY EXISTING TIMING CAPABILITIES → SPIELPLAN READY**

Example: 6 participating teams → predefined 6-team Spielplan → corresponding predefined field count → map teams to A–F → instantiate predefined programme.

The predefined template determines the number of tournament fields. Do **not** independently optimise or recalculate a different field count when using an approved predefined template.

| Flag | Value |
| --- | --- |
| **INITIAL_CURATED_TARGET** | **4–16** participants (where approved templates exist) |
| **ARBITRARY_PRODUCT_PARTICIPANT_MAX** | **NONE** |
| **02C_PLAYING_UNITS_FOR_TEMPLATE_SPLITS** | **YES** (e.g. A1 / A2) |
| **ROTATION_VIA_TEMPLATE** | **YES** — rotation is a template capability where required by an approved reference Spielplan, not a separate generic Rotation Generator |

## Design system

| Flag | Value |
| --- | --- |
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** |
| **WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE** | **PASS** |
| **NEW_PARALLEL_ACTIVITY_CARD** | **NO** |
| **NEW_PARALLEL_UI_PRIMITIVES** | **0** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES** | **0** |

## Security

| Flag | Value |
| --- | --- |
| **PASSWORD_MUTATION** | **NO** |
| **PASSWORD_HASH_WRITE** | **NO** |
| **PASSWORD_CHANGED_AT_WRITE** | **NO** |
| **CREDENTIAL_RESTORE** | **NO** |
| **CREDENTIAL_SCRIPT_EXECUTED** | **NO** |

## Verification (02C closure)

Regression gate: participant playing-unit domain/service tests, capacity overlap, API routes, `TournamentParticipantPlayingUnitsPanel`, R2 UAT regression, TP02 roadmap/architecture guardrails, relevant TP01 compatibility — recorded in PR **#876** closure.

STAGE migration inventory (read-only):

`APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 ./node_modules/.bin/tsx scripts/sce-tournament-planner-02c-stage-migration-verify.ts`
