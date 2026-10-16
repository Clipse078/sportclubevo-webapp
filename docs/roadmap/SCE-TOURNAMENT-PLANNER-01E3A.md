# SCE-TOURNAMENT-PLANNER-01E3A — Competition Phase + Qualification Architecture

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01E3A` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01E`](./SCE-TOURNAMENT-PLANNER-01.md) — Smart Generator |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01E2`](./SCE-TOURNAMENT-PLANNER-01E2.md) — **CLOSED / MERGED** (PR **#860**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#861** → STAGE) |
| **Merge commit** | *(recorded at merge — see parent roadmap)* |
| **Feature HEAD** | `38b9aee30a5d60b51486deec995e313b61ca97ae` |
| **Branch** | `cursor/sce-tournament-planner-01e3a-phase-qualification-architecture` |
| **Next** | **01E3B** — Automatic Group Formation + Group Fixture Generation (**NEXT**, not started) |

## Product purpose

01E3A establishes durable competition topology for future Groups + Knockout product work:

- competition format (`GROUP_MIX_ONLY` \| `KNOCKOUT_ONLY` \| `GROUP_PLUS_KNOCKOUT`);
- first-class `TournamentPhase` (ordered 1:n);
- `TournamentGroup` + editable `TournamentGroupMembership`;
- fixture ↔ phase ownership (`TournamentFixture.tournamentPhaseId` + legacy `stageKey`);
- `TournamentFixtureSide` + `TournamentQualificationSource` (`GROUP_RANK` minimum);
- ranking rule configuration foundation (points + tiebreak order);
- phase-aware generation contract (`phaseId` on `generateTournamentFixturesForEvent`).

**Out of scope:** bracket generation, group auto-formation, scheduling, results/standings execution, Creator/Planung UI.

## Competition format vs generation strategy

| Layer | Examples |
| --- | --- |
| **Competition format** | `GROUP_MIX_ONLY`, `KNOCKOUT_ONLY`, `GROUP_PLUS_KNOCKOUT` |
| **Phase type** | `GROUP_MIX`, `KNOCKOUT` |
| **Generation strategy (GROUP_MIX only)** | `ROUND_ROBIN`, `SMART_MIX` on `TournamentPhase.groupMixStrategy` |

Knockout bracket generation is **not** forced into `ROUND_ROBIN` / `SMART_MIX`.

## Persistence model (Prisma)

| Model | Role |
| --- | --- |
| `TournamentCompetitionConfiguration` | Durable `competitionFormat` per tournament |
| `TournamentPhase` | Ordered phases (`displayOrder`, `stageKey`, `phaseType`, label) |
| `TournamentGroup` | Group identity within a GROUP_MIX phase |
| `TournamentGroupMembership` | Participant ↔ group (editable, not generator-only) |
| `TournamentRankingConfiguration` | Win/draw/loss points + ordered tiebreak criteria |
| `TournamentQualificationSource` | Machine-readable progression (`GROUP_RANK`, future winner/loser) |
| `TournamentFixtureSide` | Exactly one source per side (A/B) per fixture |
| `TournamentFixture.tournamentPhaseId` | Durable phase ownership (legacy `stageKey` retained) |

Default football ranking contract when configuration is created: **3 / 1 / 0** points; tiebreak **POINTS → GOAL_DIFFERENCE → GOALS_SCORED → HEAD_TO_HEAD**. Execution belongs to **01J**.

## Fixture sides

Each side is **either**:

- `CONCRETE_PARTICIPANT` → `participantId`, or
- `QUALIFICATION_REFERENCE` → `qualificationSourceId`.

Legacy columns `sideAParticipantId` / `sideBParticipantId` remain for concrete fixtures and compatibility readers; they are **null** when that side is qualification-only.

`GROUP_RANK` source: `{ sourceGroupId, rank >= 1 }` → display e.g. `"1. Gruppe A"` (formatting only).

Future types reserved without implementation: `WINNER_OF_FIXTURE`, `LOSER_OF_FIXTURE` (`sourceFixtureId`).

## Qualification cycle safety (01E3A)

`GROUP_RANK` sources must reference a group in a **GROUP_MIX** phase with **lower** `displayOrder` than the destination fixture phase. Same-phase or forward references are rejected.

## Legacy compatibility

**`LEGACY_TOURNAMENT_PHASE_COMPATIBILITY`:** Pre-01E3A tournaments without configuration receive synthetic **`GROUP_MIX_ONLY`** + a single **`GROUP_MIX`** phase for `stageKey` **`MAIN`** when 01E1/01E2 generation runs (never silently upgraded to `GROUP_PLUS_KNOCKOUT`). Existing concrete fixtures are backfilled with `TournamentFixtureSide` rows in migration; phase id is linked when legacy bootstrap runs.

## Migration / backfill

Migration `20261016190000_sce_tournament_planner_01e3a_competition_phase_qualification`:

- additive tables/enums;
- nullable legacy participant columns;
- backfill concrete `TournamentFixtureSide` rows from existing participant columns;
- **no fixture rows deleted** (`EXISTING_FIXTURE_DATA_LOSS = NO`).

## Unresolved fixture feasibility (01D contract)

| Contract | Value |
| --- | --- |
| **UNRESOLVED_FIXTURE_STRUCTURAL_FEASIBILITY** | `ASSESSABLE_WHEN_FIXTURE_COUNT_AND_DURATION_KNOWN` |
| **UNRESOLVED_FIXTURE_PARTICIPANT_REST_FEASIBILITY** | `NOT_RESOLVED_UNTIL_CONCRETE_PARTICIPANTS_KNOWN` |

Pure feasibility validation still requires concrete participant ids today; mixed/unresolved sets must not pretend rest constraints are satisfied.

## Ownership & tenant isolation

Unchanged from 01E1/01E2: **`TENANT_ORGANISED_TOURNAMENTS_ONLY`**, fail-closed on unknown ownership. All new entities are tenant-scoped; services reject cross-tournament/cross-tenant relations.

## Generator compatibility

`generateTournamentFixturesForEvent({ phaseId?, strategy, ... })` targets a **GROUP_MIX** phase. Round Robin + Smart Mix regression gates remain binding.

## Knockout BYEs (deferred)

Round-robin internal BYEs stay non-persisted generation artifacts. Knockout BYEs are progression concepts — **not** fake `TournamentParticipant` opponents; bracket/BYE persistence deferred to **01E3C**.

## Staged 01E3 roadmap

| Slice | Focus |
| --- | --- |
| **01E3A** | Competition phase + qualification architecture (**this package**) |
| **01E3B** | Group formation + group fixture generation |
| **01E3C** | Knockout bracket generation + BYEs |
| **01E3D** | Group → knockout qualification mapping + progression foundation |

## Creator / Planung adoption

| Flag | Value |
| --- | --- |
| **TOURNAMENT_CREATOR_ADOPTION_REQUIRED** | **YES** (format, phases, strategies, ranking rules) |
| **TOURNAMENT_PLANUNG_ADOPTION_REQUIRED** | **YES** (groups, bracket, qualification paths) |

## Service entry points

`lib/tournament-scheduling/competition-structure/competition-structure-service.ts` — configuration, phases, groups, membership, ranking config, qualification sources, fixture sides.

## STAGE migration verification (01E3A-R1)

Verified on the designated FC Allschwil STAGE Neon database (`SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890`, host fragment `ep-wispy-hall-aso93dy6`, database `neondb`) with `APP_ENV=stage` and `SCE_DATA_ENVIRONMENT=STAGE`. Script: `scripts/sce-tournament-planner-01e3a-r1-stage-migration-verify.ts`. Applied via guarded `APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled` (not `db push`).

| Check | Result |
| --- | --- |
| **Migration applied** | `20261016190000_sce_tournament_planner_01e3a_competition_phase_qualification` — **YES** (`prisma migrate status` → up to date) |
| **PRE — tournaments (`Event.type=TOURNAMENT`)** | **47** |
| **PRE/POST — `TournamentParticipant`** | **83** / **83** (preserved) |
| **PRE/POST — `TournamentFixture`** | **0** / **0** (preserved) |
| **PRE/POST — `TournamentScheduleVersion`** | **0** / **0** (preserved) |
| **PRE/POST — `TournamentFixtureAssignment`** | **0** / **0** (preserved) |
| **Pre-migration referential audit** | `ORPHAN_SIDE_*` = 0, `CROSS_TOURNAMENT_SIDE` = 0, `CROSS_TENANT_SIDE` = 0 |
| **Existing fixtures all concrete** | **N/A** (zero fixtures on STAGE — fixture-side backfill SQL not exercised on live rows) |
| **Post-migration phase integrity** | `CROSS_TENANT_PHASE` = 0, `CROSS_TOURNAMENT_FIXTURE_PHASE` = 0, `INVALID_PHASE_ORDER` = 0 |
| **Legacy autoinference** | Migration does **not** insert competition configuration or phases; runtime legacy bootstrap remains **`GROUP_MIX_ONLY` + `GROUP_MIX` / `MAIN`** only (`ensureLegacyGroupMixPhaseForGeneration`) — never **`GROUP_PLUS_KNOCKOUT`** unless explicitly configured later |
| **PROD touched** | **NO** |

Pre-migration snapshot artifact: `/opt/cursor/artifacts/01e3a-r1-pre-migration.json` (R1 closure run).
