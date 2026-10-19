# SCE-TOURNAMENT-PLANNER-02C — Participant Playing Units

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02C` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-02`](./SCE-TOURNAMENT-PLANNER-02.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-02B`](./SCE-TOURNAMENT-PLANNER-02B.md) — **CLOSED / ACCEPTED / MERGED** |
| **Status** | **OPEN** — implementation on branch `cursor/sce-tournament-planner-02c-participant-playing-units` |
| **STAGE baseline** | `541626211eff20d2b3274897f2919fe0af5849cf` |
| **Next package** | **02D** — Rotation Generator (**NOT STARTED**) |

## Product goal

Introduce **tournament-local Spielteams** (`TournamentParticipantUnit`) distinct from registered **`TournamentParticipant`**. A club may register once (e.g. FC Allschwil Junioren E1) and appear on the field as E1, E1-1, E1-2 depending on programme configuration — **without** renaming or splitting the underlying SCE `Team`.

| Flag | Value |
| --- | --- |
| **PARTICIPANT_NEQ_PLAYING_UNIT** | **YES** |
| **PLAYING_UNIT_TOURNAMENT_LOCAL** | **YES** |
| **SOURCE_TEAM_MUTATED** | **NO** |
| **EXISTING_TOURNAMENTS_REQUIRE_UNIT_SETUP** | **NO** |
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

**DISPLAY_NAME_DETERMINES_CAPACITY** = **NO**

**ARBITRARY_MAX_SUBUNITS** = **NONE**

## Compatibility strategy

**IMPLICIT_FULL_TEAM_COMPATIBILITY**: When a participant has **zero** persisted playing units, domain services expose a **synthetic implicit FULL** unit (`implicit-full:{participantId}`) so Round Robin, Smart Mix, Groups, Knockout, and Group→KO continue using **`TournamentParticipant`** fixture sides without manual setup.

When the organiser explicitly configures Spielteams (persisted rows), only those units are listed; fixture/assignment **playing-unit references remain deferred to 02D**.

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

Canonical pipeline unchanged:

**PARTICIPANTS → PLAYING FORMATS → PLAYING UNITS → ROUNDS → ASSIGNMENTS → PITCHES / STATIONS → TIMING → SPIELPLAN**

| Flag | Value |
| --- | --- |
| **PARALLEL_SCHEDULE_TRUTH_CREATED** | **NO** |
| **PLAYING_UNIT_FIXTURE_REFERENCE_IMPLEMENTED** | **NO** |
| **PLAYING_UNIT_ASSIGNMENT_REFERENCE_IMPLEMENTED** | **NO** |
| **DEFERRED_TO_02D** | Fixture/assignment playing-unit ids |

## Results / rankings

**EXISTING_RESULTS_SEMANTICS_PRESERVED** = **YES**

**UNIT_RESULT_AGGREGATION_DECIDED** = **NO** — deferred; results remain on `TournamentParticipant` / existing fixture model until a later package decides aggregation (unit vs parent vs phase).

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

## UAT

| Flag | Value |
| --- | --- |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **PO_UAT_REQUIRED** | **YES** |
