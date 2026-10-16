# SCE-TOURNAMENT-PLANNER-01B — Persistence + Fixture Foundation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01B` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01A`](./SCE-TOURNAMENT-PLANNER-01A.md) — **CLOSED** |
| **Branch** | `cursor/sce-tournament-planner-01b-persistence-fixtures` |
| **ADR** | [`ADR-014`](./05-architecture-decisions.md#adr-014--tournament-fixture-vs-schedule-separation-and-deterministic-scheduling-engine) |

## Scope delivered

- Prisma persistence for **`TournamentFixture`**, **`TournamentScheduleVersion`**, **`TournamentFixtureAssignment`**
- Application services under `lib/tournament-scheduling/` (no generator, no scheduler)
- Structured domain errors including **`SCHEDULE.STALE_VERSION`**
- Mocked service test matrix (`lib/tournament-scheduling/__tests__/tournament-scheduling-persistence.test.ts`)

## Fixture model (`TournamentFixture`)

| Field | Role |
| --- | --- |
| `eventId` | Tournament container (`Event.type=TOURNAMENT`) |
| `stageKey` | Future format stage id (default `MAIN`) |
| `roundIndex`, `slotIndexInRound` | Deterministic ordering + generator correlation |
| `generatorKey` | Optional future 01C correlation |
| `sideAParticipantId`, `sideBParticipantId` | **Neutral A/B sides** — not `Event.homeAway` hosting semantics |

**Invariant:** sides must be distinct `TournamentParticipant` rows for the same tournament (service validation).

**Uniqueness:** `@@unique([eventId, stageKey, roundIndex, slotIndexInRound])`

Fixtures may exist without assignments. Deleting a schedule version cascades assignments only — not fixtures.

## Schedule version model (`TournamentScheduleVersion`)

| Status | Meaning |
| --- | --- |
| `WORKING` | Mutable draft (at most one per tournament when creating via service) |
| `APPROVED` | Immutable — assignment/lock mutations rejected |
| `SUPERSEDED` | Historical approved version replaced by a newer approval |

**Optimistic concurrency:** integer `revision` on the version row; assignment mutations require matching `expectedRevision` or throw **`SCHEDULE.STALE_VERSION`**.

**Optional reproducibility fields (minimal):** `matchDurationMinutes`, `transitionMinutes`, `minRestMinutes` snapshotted on the version. Operating window remains **`Event.startAt` / `Event.endAt`** (deferred richer config to 01C+).

## Assignment model (`TournamentFixtureAssignment`)

Connects **fixture + schedule version + `startAt` + `endAt` + logical `TournamentPitch`** (01D-R1 — superseded initial `FacilityResource` assignment FK).

- `@@unique([scheduleVersionId, fixtureId])` — at most one assignment per fixture per version
- Same fixture may differ across versions
- **`endAt`** derived at write time from version `matchDurationMinutes` or tenant tournament duration policy when omitted
- **`isLocked`** (+ `lockedAt`, `lockedByUserId`) — **FULL_ASSIGNMENT_LOCK** MVP foundation only

## Resource allocation boundary

**01B persists schedule assignments only.** Authoritative SCE facility occupancy / conflict integration remains existing **`TournamentResourceAllocation`**, availability services, and future materialisation — **no duplicate occupancy truth**, no automatic allocation rows on assign.

Dressing rooms remain on **`TournamentParticipantAllocation`** — not on fixture assignments.

## Delete / cascade semantics

| Parent removed | Child behaviour |
| --- | --- |
| `Event` (tournament) | Fixtures + schedule versions cascade |
| `TournamentScheduleVersion` | Assignments cascade |
| `TournamentFixture` | Assignments cascade |
| `TournamentParticipant` | **Restrict** while referenced as a fixture side |
| `TournamentPitch` | **Restrict** on assignments while referenced |
| `FacilityResource` | Unrelated to fixture assignments (physical allocations only) |

## Deferred to 01C+

- Round-robin / format registry / `generateTournamentFixtures`
- Feasibility, optimiser, regeneration, diff
- TIME_LOCK / PITCH_LOCK enum (boolean `isLocked` sufficient for MVP)
- Publication, UI planner, PDF/QR
- `TournamentFormatConfig` persistence
- Working-version fork/clone UX

## Migration

| Property | Value |
| --- | --- |
| **Name** | `20261016140000_sce_tournament_planner_01b_fixture_schedule_foundation` |
| **Tables** | `TournamentFixture`, `TournamentScheduleVersion`, `TournamentFixtureAssignment` |
| **Enums** | `TournamentScheduleVersionStatus` |
| **Backfill** | **NO** |

## Test evidence

- `lib/tournament-scheduling/__tests__/tournament-scheduling-persistence.test.ts` — fixtures, versions, assignments, locks, concurrency, isolation (mocked Prisma)
- `lib/tournaments/__tests__/tournament-service.test.ts` — regression green with existing tournament suite

## 01C handoff

Implement pure `generateTournamentFixtures` in `lib/tournament-scheduling/fixtures/` and persist via `createTournamentFixture` using stable `stageKey` / round / slot indexes — **never** re-key fixtures on schedule regeneration.
