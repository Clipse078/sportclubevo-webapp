# SCE-TOURNAMENT-PLANNER-01E3B — Automatic Group Formation + Group Fixture Generation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01E3B` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01E`](./SCE-TOURNAMENT-PLANNER-01.md) — Smart Generator |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01E3A`](./SCE-TOURNAMENT-PLANNER-01E3A.md) — **CLOSED / MERGED** (PR **#861**) |
| **Status** | **CURRENT — ready for closure (R1)** |
| **Branch** | `cursor/sce-tournament-planner-01e3b-group-formation-fixtures` |
| **Next** | **01E3C** — Knockout bracket generation (**planned**, not started) |

## Product purpose

Users select tournament participants and configure the GROUP_MIX phase (group count, Round Robin or Smart Mix). SCE then:

1. forms **count-balanced** groups deterministically;
2. persists `TournamentGroup` + `TournamentGroupMembership` (manual adjustment compatible);
3. generates fixtures **inside each group** using canonical 01E1 / 01E2 engines;
4. returns diagnostics for future Creator / Planung UI.

**Automatic first.** Manual adjustment afterward. **No knockout generation** in 01E3B.

## Group formation input

Service entry points (`lib/tournament-scheduling/group-formation/`):

- `formTournamentGroups({ tournamentId, phaseId, participantIds, groupCount })`
- `generateTournamentGroupFixturesForPhase({ tournamentId, phaseId, strategy?, … })`
- `formTournamentGroupsAndGenerateGroupFixtures(…)` — formation + fixtures in sequence

Validation: tenant-organised ownership, `GROUP_MIX` phase, format not `KNOCKOUT_ONLY`, participant set integrity, `1 <= groupCount <= participantCount`.

## Balancing guarantee

| Flag | Value |
| --- | --- |
| **GROUP_BALANCING_DIMENSION** | `PARTICIPANT_COUNT_ONLY` |
| **GROUP_SIZE_BALANCE_GUARANTEE** | **YES** (`max − min ≤ 1`) |
| **GROUP_FORMATION_DETERMINISTIC** | **YES** |
| **GROUP_FORMATION_ALGORITHM** | `SERPENTINE_BALANCED_CAPACITY` |

No sporting-strength claims — canonical participant order (`displayOrder`, `id`) only.

## Group labels

| Flag | Value |
| --- | --- |
| **GROUP_LABEL_SCHEME** | `Gruppe A`, `Gruppe B`, … `Gruppe Z`, `Gruppe AA`, … (`formatTournamentGroupLabel`) |

Labels are display-only; identity is `TournamentGroup.id` + `displayOrder`.

## Group-scoped fixtures

| Engine | Scope |
| --- | --- |
| **ROUND_ROBIN** | Existing circle method per group (`meetingsPerOpponent` 1:n) |
| **SMART_MIX** | Existing Smart Mix per group (`targetMatchesPerParticipant`) |

Generator keys include group scope: `round-robin:{stageKey}:group:{groupId}:…` / `smart-mix:{stageKey}:group:{groupId}:…`.

Structural `roundIndex` is **per group** (not a schedule).

## Fixture ↔ group relation

| Flag | Value |
| --- | --- |
| **GROUP_FIXTURE_RELATION** | `TournamentFixture.tournamentGroupId` (nullable FK) |
| **GROUP_FIXTURES_PHASE_LINKED** | **YES** (`tournamentPhaseId`) |
| **CROSS_GROUP_FIXTURE_COUNT** | **0** |
| **CROSS_GROUP_GENERATOR_KEY_COLLISION_COUNT** | **0** |

Migration: `20261016200000_sce_tournament_planner_01e3b_group_fixture_relation` — partial unique indexes for legacy vs group-scoped slot coordinates.

## Idempotency / drift

- Identical formation request + identical persisted topology → idempotent (no duplicate groups/memberships).
- Topology or generation config drift → structured conflict (`TournamentCompetitionConflictError` / `TournamentFixtureSetConflictError`).
- **DESTRUCTIVE_GROUP_REGENERATION_IMPLEMENTED** = **NO** (01G).

## Manual adjustment boundary

01E3A membership mutation remains; `moveParticipantBetweenTournamentGroups` rejects moves when **group-scoped fixtures** exist for involved groups.

## Ownership

**TOURNAMENT_PLANNER_SCOPE** = `TENANT_ORGANISED_TOURNAMENTS_ONLY` — fail closed on unknown ownership; away tournaments blocked.

## 01D handoff

Concrete group fixtures (RR or Smart Mix) are accepted by generic 01D feasibility without schedule assignment.

## Out of scope (01E3C / 01E3D / 01G / UI)

Knockout brackets, qualification resolution, standings, scheduling, pitch/time assignment, regeneration, Creator UI, Planung UI.

| Adoption flag | Value |
| --- | --- |
| **TOURNAMENT_CREATOR_ADOPTION_REQUIRED** | **YES** (future) |
| **TOURNAMENT_PLANUNG_ADOPTION_REQUIRED** | **YES** (future) |

## Roadmap sequence

| Slice | Status |
| --- | --- |
| **01E3A** | CLOSED / MERGED |
| **01E3B** | **CURRENT** |
| **01E3C** | NEXT AFTER 01E3B (**NOT STARTED**) |
| **01E3D** | PLANNED |

## STAGE migration verification (01E3B-R1)

Verified on the designated FC Allschwil STAGE Neon database (`SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890`, host fragment `ep-wispy-hall-aso93dy6`, database `neondb`) with `APP_ENV=stage` and `SCE_DATA_ENVIRONMENT=STAGE`. Script: `scripts/sce-tournament-planner-01e3b-r1-stage-migration-verify.ts`. Applied via guarded `APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled` (not `db push`).

| Check | Result |
| --- | --- |
| **Migration applied** | `20261016200000_sce_tournament_planner_01e3b_group_fixture_relation` — **YES** (`prisma migrate status` → up to date) |
| **PRE/POST — tournaments (`Event.type=TOURNAMENT`)** | **47** / **47** (preserved) |
| **PRE/POST — `TournamentParticipant`** | **83** / **83** (preserved) |
| **PRE/POST — `TournamentPhase`** | **0** / **0** (preserved) |
| **PRE/POST — `TournamentGroup`** | **0** / **0** (preserved) |
| **PRE/POST — `TournamentGroupMembership`** | **0** / **0** (preserved) |
| **PRE/POST — `TournamentFixture`** | **0** / **0** (preserved; nullable `tournamentGroupId` column added) |
| **PRE/POST — `TournamentFixtureSide`** | **0** / **0** (preserved) |
| **PRE/POST — schedule versions / assignments** | **0** / **0** (preserved) |
| **Post-migration group-fixture integrity (live rows)** | cross-tournament / cross-phase / cross-tenant / side-outside-group / cross-group = **0** |
| **`TournamentFixture.tournamentGroupId` FK** | nullable → `TournamentGroup`, **`ON DELETE RESTRICT`** (no cascade fixture delete) |
| **PROD touched** | **NO** |
| **Persistent test data on STAGE** | **NO** |

### Relational enforcement (canonical paths)

| Invariant | Enforcement |
| --- | --- |
| Fixture → group tournament (`eventId`) | **SERVICE** — group fixture generation binds `eventId`, `tournamentPhaseId`, and `tournamentGroupId` from the same phase topology; no heuristic group inference |
| Fixture phase ↔ group phase | **SERVICE** — generation uses groups listed for the requested `phaseId` only |
| Tenant alignment | **SERVICE** — tenant-scoped queries + ownership gate (`requireTenantOrganisedTournament`) |
| Both sides members of fixture group | **SERVICE** — `assertNoCrossGroupFixtures` before persist; membership loaded from `TournamentGroupMembership` |
| Referenced group delete | **DB** — FK `ON DELETE RESTRICT` |
| Participant move after group fixtures | **SERVICE** — `moveParticipantBetweenTournamentGroups` → structured conflict |
| Phase/format topology change with fixtures | **SERVICE** — `assertNoGeneratedFixtures` (01E3A, still valid for group-scoped fixtures) |

Pre-migration snapshot: `/opt/cursor/artifacts/01e3b-r1-pre-migration.json`. Post-migration report: `/opt/cursor/artifacts/01e3b-r1-post-migration.json`.
