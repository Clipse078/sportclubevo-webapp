# SCE-TOURNAMENT-PLANNER-01J — Results + Rankings + Qualification Progression

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01J` |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01I`](./SCE-TOURNAMENT-PLANNER-01I.md) — **CLOSED / ACCEPTED / MERGED** (PR **#869**) |
| **Status** | **CURRENT** |
| **Next** | [`SCE-TOURNAMENT-PLANNER-01K`](./SCE-TOURNAMENT-PLANNER-01.md) — Publication + Sharing (**NOT STARTED**) |

## Product purpose

01J adds the **live competition layer** on top of the existing competition graph (01E3A–01E3D) and Planung workspace (01H–01I):

**PLAY → ENTER RESULT → CALCULATE RANKINGS → RESOLVE QUALIFICATION → POPULATE DOWNSTREAM FIXTURES**

Scheduling (WHEN/WHERE) and sporting progression (WHO advances) remain strictly separated.

## Architecture reuse

| Contract | Reused |
| --- | --- |
| `TournamentCompetitionConfiguration` / phases / groups / fixtures | **YES** |
| `TournamentQualificationSource` (`GROUP_RANK`, `WINNER_OF_FIXTURE`) | **YES** |
| `TournamentFixtureSide` qualification provenance | **YES** |
| `TournamentRankingConfiguration` | **YES** |
| Schedule assignments / locks / revision | **Unchanged** (not mutated by results) |

## Result persistence

| Model | Role |
| --- | --- |
| `TournamentFixtureResult` | One row per fixture — scores, optional explicit KO winner, `revision` |

**`EXISTING_RESULT_MODEL_REUSED = NO`** — no prior tournament fixture result table; smallest additive extension.

### Result state

`TournamentFixtureResultState`:

- `UNPLAYED`
- `COMPLETED`

Richer match-management states (in progress, forfeits, etc.) are **not** introduced in 01J.

### KO draw semantics

- Group / round-robin draws allowed with tied scores.
- Knockout phases require **`requiresExplicitWinner = true`** when scores are equal.
- UI exposes explicit winner selection (SCE `SwitchToggle`); service persists `winnerParticipantId`.
- No alphabetical/seed/random inference.

## Ranking engine

Pure function: `calculateTournamentGroupStandings()` in `lib/tournament-scheduling/competition-progression/group-standings-pure.ts`.

Uses persisted `TournamentRankingConfiguration` (`winPoints`, `drawPoints`, `lossPoints`, `tiebreakOrder`).

Default tiebreak sequence when config absent: **Points → GD → GF → Head-to-head**.

### Head-to-head (multi-team)

When `HEAD_TO_HEAD` is reached for a tied subset, a **mini-league** among tied teams uses mutual fixtures only (points, GD, GF from those games). Perfect ties after all configured criteria use **participantId lexicographic order for display stability only** — qualification at an ambiguous rank remains **unresolved** (`participantAtGroupRank` returns null).

## Qualification resolution

Pure + service: `resolveQualificationSourceParticipant()` / `computeQualificationSideResolutions()`.

- `GROUP_RANK` → participant when rank is **uniquely** established (no tied-at-position ambiguity).
- `WINNER_OF_FIXTURE` → winner from completed source fixture (`winnerParticipantId` or score-derived).
- Updates `TournamentFixtureSide.participantId` and legacy `sideA/BParticipantId` while **retaining** `qualificationSourceId`.

**`QUALIFICATION_RESOLUTION_MUTATES_SCHEDULE_ASSIGNMENT = NO`**

## Result edit / clear impact

`calculateProgressionImpact()` blocks destructive upstream edits when **completed downstream** fixture results exist in the winner/group dependency chain.

- No silent deletion of downstream results.
- API returns `TOURNAMENT_FIXTURE_RESULT_PROGRESSION_BLOCKED` with affected fixture ids.

## Concurrency

**`RESULT_CONCURRENCY_STRATEGY = TournamentFixtureResult.revision`**

Independent from `TournamentScheduleVersion.revision`. Stale writes → `TOURNAMENT_FIXTURE_RESULT_STALE` (409).

## Atomicity

Result upsert + qualification side updates commit in a **single Prisma transaction**.

## Auditability

`lastModifiedByUserId` + `previousResultSnapshotJson` on each mutation (minimal audit without a new audit subsystem).

## Planung UX

- Schedule list / fixture actions show **prominent scores** when completed.
- Qualification placeholders remain until resolved; optional provenance subtitle when resolved.
- `TournamentPlanungGroupStandings` integrated into Planung workspace.
- Result entry via `POST .../planung/fixture-result` with reconciled `viewModel` response.

## Service boundary

| Function | Location |
| --- | --- |
| `recordTournamentFixtureResult()` | `fixture-result-service.ts` |
| `clearTournamentFixtureResult()` | `fixture-result-service.ts` |
| `calculateTournamentGroupStandings()` | `group-standings-pure.ts` |
| `computeQualificationSideResolutions()` | `qualification-resolution-pure.ts` |
| `calculateProgressionImpact()` | `progression-impact-pure.ts` |

**`RESULT_CHANGE_TRIGGERS_SCHEDULE_OPTIMISER = NO`**

## Package boundary (01K)

| Flag | Value |
| --- | --- |
| `NEW_TOURNAMENT_SCHEDULE_PUBLICATION_WORKFLOW` | **NO** |
| `PUBLIC_RESULTS_SHARING_IMPLEMENTED` | **NO** |

## STAGE migration (01J-R1 UAT readiness)

| Item | Value |
| --- | --- |
| **Migration** | `20261018120000_sce_tournament_planner_01j_fixture_results` |
| **Designated STAGE** | `APP_ENV=stage`, `SCE_DATA_ENVIRONMENT=STAGE`, fingerprint `acd3b37682911890`, host fragment `ep-wispy-hall-aso93dy6`, database `neondb` |
| **Script** | `scripts/sce-tournament-planner-01j-r1-stage-migration-verify.ts` |
| **Apply workflow** | Guarded `APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled` (not `db push`) |
| **STAGE_ENVIRONMENT_VERIFIED** | **YES** |
| **MIGRATION_APPLIED_EXACTLY_ONCE** | **YES** |
| **MIGRATION_HISTORY_HEALTHY** | **YES** |
| **POST_MIGRATION_SCHEMA_VERIFIED** | **YES** |
| **SCHEMA_DRIFT** | **NO** |
| **PROD_TOUCHED** | **NO** |

Migration SQL is additive only: enum `TournamentFixtureResultState` + table `TournamentFixtureResult` (fixture-owned, `revision` concurrency). No DDL on fixtures, assignments, schedule versions, qualification sources, or competition configuration. No backfill, no auth/password mutation.

**Pre/post counts (aggregate; designated STAGE):**

| Metric | Pre | Post |
| --- | ---: | ---: |
| `TournamentFixture` rows | 0 | 0 |
| `TournamentFixtureAssignment` rows | 0 | 0 |
| `TournamentScheduleVersion` rows | 0 | 0 |
| `TournamentParticipant` rows | 83 | 83 |
| `TournamentQualificationSource` rows | 0 | 0 |
| `TournamentCompetitionConfiguration` rows | 0 | 0 |

## Ownership

Reuses `canTenantPlanTournament` / `resolveTournamentPlannerOwnership`. AWAY tournaments: no result management workflow.
