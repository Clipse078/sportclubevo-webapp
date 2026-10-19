# SCE-TOURNAMENT-PLANNER-02A — Programme Architecture & Format Model

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02A` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-02`](./SCE-TOURNAMENT-PLANNER-02.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01M`](./SCE-TOURNAMENT-PLANNER-01M.md) — **CLOSED / ACCEPTED / MERGED** (PR **#873**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#874**) |
| **Branch** | `cursor/sce-tournament-planner-02a-programme-architecture` |
| **STAGE baseline** | `7c4af4a3e42499132ec797b2358b6ac9505a513c` |
| **ADR** | [`ADR-015`](./05-architecture-decisions.md#adr-015--tournament-programme-architecture-and-generic-playing-format) |
| **Contracts** | `lib/tournament-scheduling/tournament-programme-architecture.ts` |
| **Next package** | **02B** — Playing Formats & Tournament Pitches (**NOT STARTED**) |

## Preflight

| Check | Result |
| --- | --- |
| `START_BRANCH` | `STAGE` |
| `STARTING_HEAD_FULL` | `7c4af4a3e42499132ec797b2358b6ac9505a513c` |
| `ORIGIN_STAGE` | `7c4af4a3e42499132ec797b2358b6ac9505a513c` |
| `EXPECTED_BASELINE_CONTAINED` | **YES** |
| `TOURNAMENT_PLANNER_01_CLOSED` | **YES** (PR **#873**, 01M PO UAT **PASS**) |
| `FEATURE_BRANCH` | `cursor/sce-tournament-planner-02a-programme-architecture` |

## 02A scope

**In scope:** architecture, domain contracts, extension model, migration/adoption plan, guardrail tests, ADR.

**Out of scope (later packages):**

| Deferred | Package |
| --- | --- |
| Full rotation generator | 02D |
| `TournamentParticipantUnit` persistence | 02C |
| `TournamentStation` persistence | 02E |
| In-round phase persistence | 02F |
| Rotation Creator UI | 02H / later UX |
| Advanced fairness optimiser | 02G |
| Swiss-specific presets / E·FF12 business rules | Optional templates above engine |
| Vielseitigkeit implementation | 02E |
| Final Tournament Planner 02 UX | 02H |

## 1. Canonical programme pipeline

Binding stage order (`TOURNAMENT_PROGRAMME_PIPELINE_STAGES`):

1. **PARTICIPANTS** — `TournamentParticipant` (01)
2. **PLAYING FORMATS** — generic `playersPerSide` per logical pitch (02B)
3. **PLAYING UNITS** — full team / subteams (02C)
4. **ROUNDS** — programme rounds mixing matches and non-match slots
5. **ASSIGNMENTS** — match, alternative activity, rest/idle
6. **PITCHES / STATIONS** — logical pitches + future stations
7. **TIMING** — window, round duration, in-round phases, rest, breaks
8. **SPIELPLAN** — canonical outputs (01K+)

01 pipeline stages in `smart-generator-architecture.ts` remain valid for RR / Smart Mix / KO paths; 02 **extends** the product story toward programme generation.

## 2. Playing format — core decision

### Primary semantic

| Field | Value |
| --- | --- |
| **GENERIC_PLAYING_FORMAT** | **YES** |
| **PRIMARY_SEMANTIC** | **`playersPerSide`** (integer value object) |
| **HARD_CODED_3V3_6V6_ENUM** | **NO** |
| **USER_DEFINED_PLAYERS_PER_SIDE_FUTURE_READY** | **YES** |

Display is **metadata**: default label `${n}v${n}` via `formatPlayersPerSideDisplayLabel`.

### Playing format optionality (permanent product rule)

| Flag | Value |
| --- | --- |
| **PLAYING_FORMAT_OPTIONAL_BY_DEFAULT** | **YES** |
| **PLAYING_FORMAT_REQUIRED_GLOBALLY** | **NO** |
| **UNSPECIFIED_PLAYING_FORMAT_VALID** | **YES** |
| **DEFAULT_PLAYING_FORMAT_ASSIGNED** | **NO** |
| **SILENT_FORMAT_INFERENCE** | **NO** |
| **NORMAL_TOURNAMENT_FORMAT_REQUIRED** | **NO** |
| **LEGACY_TOURNAMENT_FORMAT_REQUIRED** | **NO** |
| **ADVANCED_FORMAT_MAY_REQUIRE_PLAYING_FORMAT** | **YES** |

`PlayingFormat` is an **optional** capability on logical `TournamentPitch`. Organisers may run a complete tournament with every pitch **unspecified** (Feld 1/2/3 with no `playersPerSide`). Mixed specified/unspecified pitches per tournament is valid.

**Tournament pitch capability (optional)** is distinct from **selected advanced programme format requirements**: Round Robin, Smart Mix, Groups, Knockout, and Group+Knockout must **not** require `PlayingFormat` merely because 02 exists. Future **ROTATION** (or similar) may require format on relevant pitches when its configuration semantically depends on it — that validation belongs to the programme format, not global pitch rules.

No mandatory Creator selector, no arbitrary default (e.g. 5v5), no silent inference from age category, team name, or pitch label.

### Validation band (02A contract — technical, not product max)

| Constant | Value | Rationale |
| --- | --- | --- |
| `PLAYERS_PER_SIDE_MIN` | **1** | Defensive technical floor |
| `PLAYERS_PER_SIDE_MAX` / `PLAYERS_PER_SIDE_TECHNICAL_BOUND_MAX` | **22** | Defensive architecture bound (11v11 headroom); **not** a permanent sporting/business maximum |
| `PLAYERS_PER_SIDE_PRODUCT_MAX` | **(none in 02A)** | Product caps deferred — **02B** may revise bounds or strategy |
| `TECHNICAL_BOUND_IS_PRODUCT_RULE` | **NO** |
| `BOUND_REVIEW_DEFERRED_TO_02B` | **YES** |

Presets may **suggest** common values (3, 4, 5, 6, 7, 9, 11) without encoding them as the only legal set.

### Display vs scheduling semantics

| Layer | Purpose |
| --- | --- |
| **A. Display metadata** | Labels, Creator copy, Spielplan presentation |
| **B. Scheduling / capacity semantics** | Which playing units may use which pitch (02C + 02B compatibility engine) |

02A defines the contract only; compatibility enforcement is **02C/02B**.

## 3. TournamentPitch remains logical

Permanent 01 invariant preserved:

| Flag | Value |
| --- | --- |
| **LOGICAL_TOURNAMENT_OWNED** | **YES** |
| **FACILITY_RESOURCE_SEPARATE** | **YES** |
| **MULTIPLE_LOGICAL_PITCHES_PER_PHYSICAL_RESOURCE_FUTURE_READY** | **YES** |

Example: one `FacilityResource` “Kunstrasen 2” may host logical pitches “Feld 1” (3v3), “Feld 2” (3v3), “Feld 3” (6v6), or equally “Feld 1/2/3” all **unspecified**.

Future relationship:

`TournamentPitch` → optional `PlayingFormat` (02B)  
`TournamentResourceAllocation` → physical `FacilityResource` (unchanged)

Playing format must **not** collapse `TournamentPitch` into `FacilityResource`.

## 4. Participant vs playing unit

| Concept | Role |
| --- | --- |
| **TournamentParticipant** | Registered tournament identity (e.g. FC Allschwil E1) |
| **TournamentParticipantUnit** (future) | Unit scheduled in programme (E1 full team, E1-1, E1-2) |

| Flag | Value |
| --- | --- |
| **PARTICIPANT_NEQ_PLAYING_UNIT** | **YES** |
| **FULL_TEAM_FUTURE_READY** | **YES** |
| **SUBTEAM_FUTURE_READY** | **YES** |
| **PARENT_CAPACITY_CONTRACT_DEFINED** | **YES** |

Capacity example (contract):

- **E1-1 + E1-2 simultaneously** → may be valid (subteams)
- **E1 + E1-1 simultaneously** → normally **invalid** (shared parent capacity)

Express via `ParentParticipantCapacityRule` in architecture module; persistence in **02C**.

## 5. Rotation as first-class format

| Flag | Value |
| --- | --- |
| **FIRST_CLASS_FORMAT** | **YES** (`AdvancedProgrammeCompetitionFormat.ROTATION`) |
| **FORCED_INTO_SMART_MIX** | **NO** |
| **GENERATOR_IMPLEMENTED** | **NO** |

| Engine | Problem |
| --- | --- |
| **SMART_MIX** | Balanced **opponent** selection (WHO) |
| **ROTATION** | Broader **programme** across formats, units, rounds, stations |

Rotation coexists with ROUND_ROBIN, SMART_MIX, GROUPS, KNOCKOUT, GROUP+KNOCKOUT.

## 6. Fixture vs programme assignment

01 schedules **`TournamentFixture` → `TournamentFixtureAssignment`** on `TournamentScheduleVersion`.

02 introduces assignment **kinds** (future rows on the **same** schedule version):

| Kind | Meaning |
| --- | --- |
| **MATCH** | Binds existing `TournamentFixture` (01 assignment model preserved) |
| **ALTERNATIVE_ACTIVITY** | Non-fixture programme slot (e.g. skill station) |
| **REST_IDLE** | Explicit idle/rest for a unit |

| Flag | Value |
| --- | --- |
| **FIXTURE_RELATIONSHIP_DEFINED** | **YES** |
| **NON_FIXTURE_ASSIGNMENTS_FUTURE_READY** | **YES** |
| **PARALLEL_SCHEDULE_TRUTH_CREATED** | **NO** |

Evolution: additive programme assignment entity (02E+) referencing the same canonical version; Team-Spielplan projects all kinds for a participant/unit.

## 7. Future TournamentStation

| Station kind | Notes |
| --- | --- |
| **MATCH_PITCH** | References logical `TournamentPitch` — match locations stay pitch-centric |
| **ALTERNATIVE_ACTIVITY** | Skill / variety stations |
| **REST_IDLE** | Explicit rest locus (may not need a physical pitch) |

| Flag | Value |
| --- | --- |
| **TOURNAMENT_STATION_CONTRACT_DEFINED** | **YES** |
| **STATION_PERSISTENCE_IMPLEMENTED** | **NO** |

Recommendation: do **not** demote `TournamentPitch` to a generic station; stations **reference** pitches when kind is MATCH_PITCH.

## 8. Round model

A **programme round** may contain:

- several matches
- different playing formats
- several tournament pitches
- alternative activities
- idle/rest assignments

Illustrative generic round (not a hard-coded Swiss schema):

| Slot | Content |
| --- | --- |
| Feld 1 · 3v3 | A1 vs B1 |
| Feld 2 · 3v3 | A2 vs B2 |
| Feld 3 · 6v6 | C vs D |
| Station 1 | Alternative activity · E |
| Idle | F |

## 9. In-round phases (future)

Distinct from tournament break, transition, team rest, or whole round boundary.

Example: round duration 12 minutes; 3v3 units switch after 5 minutes → **IN_ROUND_PHASE** (02F).

Timing concepts remain separate (`TIMING_CONCEPTS`):

`TOURNAMENT_WINDOW` · `ROUND_DURATION` · `IN_ROUND_PHASE` · `MATCH_DURATION` · `TRANSITION_DURATION` · `TEAM_REST` · `TOURNAMENT_BREAK`

| Flag | Value |
| --- | --- |
| **IN_ROUND_PHASE_CONTRACT_DEFINED** | **YES** |
| **IN_ROUND_PHASE_IMPLEMENTED** | **NO** |

## 10. Fairness model (future)

Soft dimensions (`FAIRNESS_OPTIMISATION_DIMENSIONS`): match count, playing time, opponent diversity, rematch distribution, rest/idle, alternative activities, format exposure, pitch exposure, pitch switching, first/last round, temporal distribution.

| Flag | Value |
| --- | --- |
| **HARD_CONSTRAINTS_DOMINATE** | **YES** |
| **HEURISTIC_FAILURE_NEQ_INFEASIBLE** | **YES** (01M rule preserved) |
| **ADVANCED_OPTIMISER_IMPLEMENTED** | **NO** |

## 11. Spielplan output contract

Unchanged 01 principle: **one canonical programme**, multiple outputs. Future Team-Spielplan example (derived):

`09:30 · 3v3 · Feld 1` → `09:45 · 6v6 · Feld 3` → `10:00 · Pause` → …

No separate persisted team schedule.

## 12. Simple user experience (target)

Creator shows friendly labels (Turnierformat, Teams, Spielfelder with “Feld 1 · 3v3”), not internal terms (`TournamentParticipantUnit`, `ProgrammeAssignment`, constraint graphs).

02A does **not** add Creator controls — adoption deferred.

## 13. Backward compatibility

| Flag | Value |
| --- | --- |
| **EXISTING_TOURNAMENTS_VALID** | **YES** |
| **PLAYING_FORMAT_REQUIRED_FOR_LEGACY_TOURNAMENTS** | **NO** |
| **NORMAL_TOURNAMENT_FORMAT_REQUIRED** | **NO** |
| **UNSPECIFIED_FORMAT_BACKWARD_COMPATIBLE** | **YES** |

`PlayingFormatSpecificationState.UNSPECIFIED` is valid for normal and legacy tournaments until an **explicitly selected** advanced programme format requires format metadata.

Round Robin / Smart Mix / Groups / Knockout paths must not suddenly require 3v3/5v5 configuration.

## 14. Data model review

| Flag | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **NO** |
| **NEW_MIGRATION** | **NO** |
| **PROD_TOUCHED** | **NO** |

02A establishes contracts first; `TournamentPitch` has no `playersPerSide` column until **02B** when justified.

## 15. Creator adoption (02A)

| Surface | Required in 02A |
| --- | --- |
| **TOURNAMENT_CREATOR_ADOPTION_REQUIRED** | **NO** |
| **TOURNAMENT_PLANUNG_ADOPTION_REQUIRED** | **NO** |
| **SPIELPLAN_OUTPUT_ADOPTION_REQUIRED** | **NO** |

## 16. Architecture guardrails (automated)

See `lib/tournament-scheduling/__tests__/tournament-programme-architecture-02a.test.ts` and roadmap tests.

| Invariant | Expected |
| --- | --- |
| `TOURNAMENT_PITCH_IS_LOGICAL` | YES |
| `TOURNAMENT_PITCH_NEQ_FACILITY_RESOURCE` | YES |
| `PLAYING_FORMAT_GENERIC` | YES |
| `PLAYING_FORMAT_OPTIONAL_BY_DEFAULT` | YES |
| `PLAYING_FORMAT_REQUIRED_GLOBALLY` | NO |
| `UNSPECIFIED_PLAYING_FORMAT_VALID` | YES |
| `DEFAULT_PLAYING_FORMAT_ASSIGNED` | NO |
| `SILENT_FORMAT_INFERENCE` | NO |
| `NORMAL_TOURNAMENT_FORMAT_REQUIRED` | NO |
| `LEGACY_TOURNAMENT_FORMAT_REQUIRED` | NO |
| `ADVANCED_FORMAT_MAY_REQUIRE_PLAYING_FORMAT` | YES |
| `PLAYING_FORMAT_HARD_CODED_SWISS_ENUM` | NO |
| `PLAYING_FORMAT_HARD_CODED_3V3_6V6_ENUM` | NO |
| `ROTATION_FIRST_CLASS_FUTURE_FORMAT` | YES |
| `ROTATION_FORCED_INTO_SMART_MIX` | NO |
| `PARTICIPANT_NEQ_PLAYING_UNIT` | YES |
| `ONE_CANONICAL_PROGRAMME` | YES |
| `TEAM_SPIELPLAN_DERIVED` | YES |
| `TOURNAMENT_PLANNER_01_BACKWARD_COMPATIBLE` | YES |

## 17. Design system / UI

No substantial new UI in 02A.

| Flag | Value |
| --- | --- |
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** (no UI changes) |
| **WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE** | **PASS** |
| **NEW_PARALLEL_UI_PRIMITIVES** | **0** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES** | **0** |

## 18. Security

| Flag | Value |
| --- | --- |
| **PASSWORD_MUTATION** | **NO** |
| **PASSWORD_HASH_WRITE** | **NO** |
| **CREDENTIAL_SCRIPT_EXECUTED** | **NO** |

## 19. UAT

| Flag | Value |
| --- | --- |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

## 20. Package 02B scope (not started)

02B owns: `PlayingFormat` persistence, optional `TournamentPitch` playing format, `playersPerSide` configuration UI, **no** mandatory format for normal tournaments, **no** arbitrary default, **no** silent inference, format-specific validation only where semantically necessary, and Creator/Planung adoption where appropriate. Do **not** use a binary checkbox “Spielform verwenden” when progressive disclosure or optional fields suffice; canonical SCE toggles only for true ON/OFF settings.

## 21. Verification (02A delivery)

Run Tournament Planner regression gate plus 02A tests — recorded in PR **#874** closure.
