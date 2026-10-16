# SCE-TOURNAMENT-PLANNER-01E3C — Knockout Bracket Generation + BYEs

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01E3C` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01E`](./SCE-TOURNAMENT-PLANNER-01.md) — Smart Generator |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01E3B`](./SCE-TOURNAMENT-PLANNER-01E3B.md) — **CLOSED / ACCEPTED / MERGED** (PR **#862**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#863** → STAGE) |
| **Merge commit** | `d93e85d8684471eb6a0a00f6273fd9dc220bde71` |
| **Feature HEAD** | `1cd034267056ff605778fa641b8785fd3b9d8fa5` (R1 accepted); closure docs `5383ad76e1cd911e24b465b017605e47719abc55` on feature branch |
| **Branch** | `cursor/sce-tournament-planner-01e3c-knockout-bracket-byes` |
| **Next** | **01E3D** — Group → knockout qualification mapping + progression foundation (**NOT STARTED**) |

## Product purpose

For tenant-organised tournaments with a **KNOCKOUT** phase, SCE generates a deterministic single-elimination bracket:

- bracket size (smallest power of two ≥ entrant count);
- structural rounds and positions (`roundIndex`, `slotIndexInRound`);
- first-round BYEs without fake opponents or fake fixtures;
- `WINNER_OF_FIXTURE` progression between played knockout fixtures;
- exactly **one** final fixture for entrant count ≥ 2;
- **N − 1** real fixtures (BYEs do not inflate fixture count).

**Out of scope:** scheduling assignments, results/standings, group-rank → concrete participant resolution (01E3D), third-place/consolation brackets, Creator/Planung UI.

## Applicable formats

| Format | Knockout generation |
| --- | --- |
| **KNOCKOUT_ONLY** | **YES** — concrete `TournamentParticipant` entrants |
| **GROUP_PLUS_KNOCKOUT** | **YES** — KNOCKOUT phase with ordered qualification sources |
| **GROUP_MIX_ONLY** | **NO** KNOCKOUT phase |
| **GROUP_MIX** phase type | **Rejected** |

## Entrant modes

| Mode | Typical use | Representation |
| --- | --- | --- |
| **Concrete participants** | `KNOCKOUT_ONLY` | `TournamentParticipant.id` on fixture side |
| **Qualification sources** | `GROUP_PLUS_KNOCKOUT` | `GROUP_RANK` (and structural `WINNER_OF_FIXTURE` in later rounds) |

Caller supplies **ordered** entrant sources. SCE does **not** invent cross-group pairing policy (01E3D).

Duplicate source-team participants remain distinct entrants (`DUPLICATE_SOURCE_TEAM_PARTICIPANTS_SUPPORTED = YES`).

## Bracket size and BYEs

| Rule | Value |
| --- | --- |
| **BRACKET_SIZE** | Smallest power of two ≥ entrant count |
| **BYE_COUNT** | `bracketSize − entrantCount` |
| **Minimum entrants** | 2 (structured domain error below) |

### BYE representation

**`BYE_REPRESENTATION = OMITTED_FIXTURE_WITH_DIRECT_ENTRANT_OR_QUALIFICATION_SOURCE_ADVANCEMENT`**

- BYE is **not** a `TournamentParticipant`, fake team, or played fixture.
- Entrant receiving BYE propagates structurally to the correct later-round side (same participant or qualification reference).
- **`FAKE_BYE_FIXTURE_COUNT = 0`**, **`FAKE_BYE_RESULT_COUNT = 0`**.

### BYE distribution

**`BYE_DISTRIBUTION_ALGORITHM = STANDARD_BRACKET_SEED_ORDER_LOWEST_SEEDS_ARE_BYE_SLOTS`**

Iterative standard bracket seed spread (deterministic). Seeds beyond `entrantCount` are BYE slots, so higher caller-order seeds receive BYEs first (e.g. seed 1 vs BYE before lower-priority seeds play).

## Structural rounds

**`KNOCKOUT_ROUND_MODEL = STRUCTURAL_ROUND_INDEX_AND_SLOT_INDEX_IN_ROUND_ON_TOURNAMENT_FIXTURE`**

- `roundIndex` increases from first played round toward the final.
- `slotIndexInRound` is stable within a round.
- User-facing labels (Viertelfinale, Halbfinale, …) are derived in future UI — not durable identity.

## Generator keys

**`knockout:{stageKey}:r{roundIndex}:s{slotIndexInRound}`** — namespace disjoint from `round-robin:` and `smart-mix:`.

## Persistence

| Field | Knockout value |
| --- | --- |
| `TournamentFixture.tournamentPhaseId` | KNOCKOUT phase id |
| `TournamentFixture.tournamentGroupId` | **null** |
| `TournamentFixtureSide` | `CONCRETE_PARTICIPANT` or `QUALIFICATION_REFERENCE` |
| `TournamentQualificationSource` | `WINNER_OF_FIXTURE` for inter-fixture progression (created per fixture; not resolved until results — 01J) |

## Schema

**`EXISTING_SCHEMA_SUFFICIENT_FOR_KNOCKOUT = YES`**

No new migration in 01E3C. 01E3A qualification + fixture-side architecture covers omitted BYE fixtures, `WINNER_OF_FIXTURE`, and structural rounds.

## Service entry points

| API | Role |
| --- | --- |
| `generateKnockoutBracketPure` | Pure deterministic topology + diagnostics |
| `generateKnockoutBracketForPhase` | Tenant-organised persistence, idempotency, drift detection |

Module: `lib/tournament-scheduling/knockout-bracket/`.

## Idempotency and drift

- Identical phase + ordered entrants → same generator keys → idempotent return.
- Existing knockout fixtures with different topology → **`TournamentFixtureSetConflictError`** (no silent rebuild; 01G owns regeneration).

## Ownership

Unchanged: **`TENANT_ORGANISED_TOURNAMENTS_ONLY`**, fail-closed on unknown ownership.

## 01D handoff

| Contract | Value |
| --- | --- |
| **KNOCKOUT_FIXTURE_01D_STRUCTURAL_HANDOFF** | **PASS** (fixture count + duration assessable) |
| **KNOCKOUT_UNRESOLVED_PARTICIPANT_REST_STATUS** | **UNRESOLVED_FOR_QUALIFICATION_FIXTURES** |

## Boundaries (explicit non-goals)

| Area | 01E3C |
| --- | --- |
| Results / winner resolution | **NO** |
| Standings / group-rank resolution | **NO** (01E3D / 01J) |
| Scheduling / pitches / times | **NO** |
| Third-place / consolation | **NO** |
| UI | **NO** |

## Staged 01E3 roadmap

| Slice | Focus |
| --- | --- |
| **01E3A** | CLOSED / MERGED |
| **01E3B** | CLOSED / MERGED |
| **01E3C** | Knockout bracket + BYEs — **CLOSED / MERGED** (**this package**) |
| **01E3D** | Group → KO qualification mapping + progression (**NEXT**) |

## Creator / Planung adoption

Future Creator configures K.-o.-Turnier or Gruppenphase + K.-o.-Phase without hand-building every fixture. Future Planung renders rounds, BYEs, qualification placeholders, and `WINNER_OF_FIXTURE` paths from this structure.

## R1 closure proof (SCE-TOURNAMENT-PLANNER-01E3C-R1)

Automated gate on branch `cursor/sce-tournament-planner-01e3c-knockout-bracket-byes` (PR **#863**).

| Proof area | Result |
| --- | --- |
| **Exhaustive topology N = 2..128** | **PASS** — `tournament-planner-01e3c-knockout-bracket-exhaustive.test.ts` + `knockout-bracket-invariants.ts` |
| **Mixed-source BYE matrix** (3, 5, 6, 7, 9, 12) | **PASS** — concrete + `GROUP_RANK` qualification sources |
| **BYE direct advancement** | **YES** — omitted fixture; entrant/source propagates to later structural side |
| **Concrete BYE source preserved** | **YES** — `CONCRETE_PARTICIPANT` on final side (no fake `WINNER_OF_FIXTURE` for BYE) |
| **GROUP_RANK BYE source preserved** | **YES** — qualification reference retained structurally (no resolution) |
| **Source cardinality** | **Exactly one canonical source per knockout side** (discriminated union) |
| **Reachability / orphans** | **0** orphaned initial entrant sources, winner sources, dangling side refs |
| **Duplicate active paths** | **0** duplicated entrant/qualification identities on fixture sides |
| **N − 1 real fixtures** | **PASS** for all tested N (BYEs do not inflate count) |
| **Final fixture count** | **1** per bracket |
| **DAG / cycles** | **PASS** — forward-only `WINNER_OF_FIXTURE` edges + DFS cycle check |
| **Structural positions** | **0** duplicate `(roundIndex, slotIndexInRound)` |
| **Generator keys** | **0** collisions; keys match `knockout:{stageKey}:r{roundIndex}:s{slotIndexInRound}` |
| **GROUP + knockout handoff** | **PASS** — semifinals `GROUP_RANK`, final `WINNER_OF_FIXTURE` only |
| **Phase-order integrity** | Enforced in 01E3A `validateQualificationSourceForFixtureSide` (`displayOrder` on `TournamentPhase`) |
| **Idempotency / drift** | **PASS** — service tests (generator key match / conflict) |
| **Concurrency** | **PASS** — P2002 unique race → idempotent re-read (no duplicate creates) |
| **Failure atomicity** | **PASS** — single transaction; failure surfaces without partial return |
| **01D handoff** | **PASS** — unresolved qualification sides for participant-rest |
| **Package boundary** | **01E3D NOT STARTED** — no group-rank → participant resolution, no results engine |

Explicit non-power-of-two proofs covered in exhaustive suite: **N = 3, 5, 6, 7, 9, 10, 12, 17**. Power-of-two regression: **2, 4, 8, 16, 32, 64, 128** with **BYE_COUNT = 0**.

**Schema:** no migration in R1 (`SCHEMA_CHANGE = NO`).

**01E3C** is **CLOSED / ACCEPTED / MERGED** (PR **#863**). **01E3D** remains **NOT STARTED**.

## Smart Timing Advisor (01F roadmap — not implemented in 01E3C)

**`SMART_TIMING_ADVISOR_IMPLEMENTED_IN_01E3C = NO`**

Parent roadmap [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) records **01F** as **Automatic Schedule Optimiser + Smart Timing Advisor** — a bidirectional, continuously recalculating tournament timing engine (forward/backward calculation, feasibility evaluation, proactive nudges). User remains in control; SCE continuously recalculates and surfaces guidance when planning inputs change.
