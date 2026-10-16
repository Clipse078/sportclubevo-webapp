# SCE-TOURNAMENT-PLANNER-01E3C — Knockout Bracket Generation + BYEs

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01E3C` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01E`](./SCE-TOURNAMENT-PLANNER-01.md) — Smart Generator |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01E3B`](./SCE-TOURNAMENT-PLANNER-01E3B.md) — **CLOSED / ACCEPTED / MERGED** (PR **#862**) |
| **Status** | **CURRENT — ready for review** |
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
| **01E3C** | Knockout bracket + BYEs (**this package**) |
| **01E3D** | Group → KO qualification mapping + progression (**NEXT**) |

## Creator / Planung adoption

Future Creator configures K.-o.-Turnier or Gruppenphase + K.-o.-Phase without hand-building every fixture. Future Planung renders rounds, BYEs, qualification placeholders, and `WINNER_OF_FIXTURE` paths from this structure.
