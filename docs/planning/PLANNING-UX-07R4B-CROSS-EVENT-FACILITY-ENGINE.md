# PLANNING-UX-07R4B — Cross-event facility availability engine

## Purpose

Prove and preserve the **canonical, resource + time + tenant** occupancy contract used by the operational resource picker (`PlanningResourcePicker` → `CompactOperationalResourceSelector`). Occupancy must **not** be isolated by the entity type being edited (Match, Training, Tournament).

## Architecture (single engine)

```
PlanningResourcePicker
  → CompactOperationalResourceSelector (+ formatResourceOccupancyPrimaryLine)
  → availability map from parent (useFacilityAvailability or equivalent)
ResourceAvailabilityAnnotation
  ← useFacilityAvailability (client)
  ← GET /api/facilities/availability
  ← getResourceAvailability (lib/facilities/availability-service.ts)
  ← parallel set queries + timeRangesOverlap (lib/facilities/allocation-rules.ts)
  ← persisted allocation sources (see matrix)
```

Public entry point: **`getResourceAvailability`** (also exposed as REST **`GET /api/facilities/availability`**).

Groups:

- **`PITCH_HALL`** — `FacilityResource` types `FULL_PITCH`, `HALF_PITCH` (with FULL/HALF derived sibling rules in-engine).
- **`DRESSING_ROOM`** — `FacilityResource` type `DRESSING_ROOM`.

## Allocation source matrix

| Source | Persistence model | Query path | Time overlap | Resource types | Owner label | In availability | Exclusion behaviour |
|--------|-------------------|------------|--------------|----------------|-------------|-----------------|---------------------|
| **Training** | `TrainingSession` (SCHEDULED) + `TrainingSessionAllocation` overrides OR `TrainingAllocation` on `TrainingSeries` | `findTrainingConflicts` → `prisma.trainingSession.findMany` | DB prefilter on session/override window; effective window `overrideStartAt ?? startAt` / `overrideEndAt ?? endAt` | PITCH_HALL / DRESSING_ROOM via `classifyFacilityResourceType` | `trainingSeries.title` | **YES** | `excludeTrainingSessionId` removes **only** that session; weekplanner replaced activities skipped |
| **Match** | `Event` `type=MATCH` legacy codes: `pitchCode`, `homeDressingRoomCode`, `awayDressingRoomCode` → resolved to `FacilityResource.id` by `code` | `findMatchConflicts` → `prisma.event.findMany` | `timeRangesOverlap` on operational interval; meaningless intervals skipped (`isMeaningfulEventInterval`) | PITCH_HALL / DRESSING_ROOM | `vs. {opponentName}` or `title` | **YES** | `excludeEventId` removes **only** that Event id |
| **Tournament (pitch/hall)** | `TournamentResourceAllocation` → `FacilityResource` | `findTournamentConflicts` (PITCH_HALL branch) | `timeRangesOverlap` on parent `Event` interval | PITCH_HALL | `event.title` | **YES** | `excludeEventId` filters allocations whose `event.id` matches |
| **Tournament (participant Garderobe)** | `TournamentParticipantAllocation` → `FacilityResource` | `findTournamentConflicts` (DRESSING_ROOM branch) | `timeRangesOverlap` on parent `Event` interval | DRESSING_ROOM | team / external / display / manual + event title | **YES** | `excludeEventId` excludes rows for that tournament **event** (intra-tournament peers re-merged in UI — see below) |
| **Weekplanner / manual plan** | Plan overrides + effective canonical fallback | `findWeekplannerPlanConflicts` via `lib/weekplanner/availability-integration.ts` when `weekplannerPlanId` set | `resourceOccupancyWindowsOverlap` / `timeRangesOverlap` | PITCH_HALL / DRESSING_ROOM | activity labels from effective plan resolution | **YES** (plan context) | Replaces direct canonical queries for that request; `excludeWeekplannerActivityType` + `excludeWeekplannerActivityId` |
| **Veranstaltung / Club event** | `Event` `type=OTHER` — schedule/participation only; **no** `TrainingAllocation` / tournament allocation / match code booking in this engine | N/A | N/A | N/A | N/A | **NOT APPLICABLE** | N/A |
| **Other Event types** (`TRAINING`, `VACATION_PERIOD` on Event) | Not used for facility occupancy in this engine (training uses `TrainingSession`) | N/A | N/A | N/A | N/A | **NOT APPLICABLE** | N/A |

## Time overlap semantics

Canonical primitive: **`timeRangesOverlap`** in `lib/facilities/allocation-rules.ts`:

- Overlap when `startA < endB && startB < endA` (after coercing missing ends to starts).
- **Touching** boundaries (end equals other start) → **no** overlap.

Training sessions additionally use a database OR filter aligned with the same windows.

## Exclusion semantics (edit / self-conflict)

| Parameter | Match | Training | Tournament |
|-----------|-------|----------|------------|
| `excludeEventId` | Excludes this match’s `Event` row from match + tournament allocation queries | N/A | Excludes **all** DB rows tied to that tournament event id (pitch + participant allocations) |
| `excludeTrainingSessionId` | N/A | Excludes this occurrence only | N/A |
| Weekplanner exclusions | `excludeWeekplannerActivityType` + `excludeWeekplannerActivityId` for the activity under edit | same | same |

**Cross-event protected:** exclusions are **id-scoped**. They must not remove unrelated matches, trainings, or tournaments. Regression: overlapping “other” match still OCCUPIED when `excludeEventId` targets a different id.

**Tournament participants (UX-07R3):** `excludeEventId` intentionally removes same-event participant allocations from the API response so the editor does not self-conflict. **`mergeTournamentParticipantDressingRoomAvailability`** (`lib/planning/resource-occupancy-presentation.ts`) re-injects **other participants’** Garderobe assignments for the same tournament window. Cross-event allocations (training/match/other tournament) still come from the API unchanged.

There is **no** separate `excludeTournamentId` — tournaments are Events; use `excludeEventId`.

## Cross-event behaviour (required scenarios)

All scenarios A–G are satisfied by **`getResourceAvailability`** aggregating training + match + tournament sources for the requested `[startAt, endAt]` (plus optional occupancy buffers). Scenario H uses API exclusion + presentation merge as documented above.

## Pitch / hall / dressing room

Same engine and maps for both groups; `useFacilityAvailability` fetches **PITCH_HALL** and **DRESSING_ROOM** in parallel (two HTTP calls, one service implementation).

FULL/HALF pitch coupling is applied **inside** `getResourceAvailability` after conflict aggregation (not a separate engine).

## Owner label quality

- Training: series title (e.g. team-oriented training name).
- Match: `vs. {opponentName}` or event title — no raw ids.
- Tournament pitch: event title.
- Tournament participant Garderobe: resolved participant display + event title.

Domain-specific merges (Match Heim/Gast current selection, tournament participant context) augment display only; they do not replace global occupancy from the engine.

## Sharing semantics (UX-07R3 / R4)

**OCCUPIED ≠ disabled.** `CompactOperationalResourceSelector` keeps occupied resources selectable; labels show who uses the resource (`Frei` / owner / `Geteilt mit`).

## Tenant isolation

- `tenantId` from authenticated session in the API route — never from query params.
- Every prisma `where` in `availability-service.ts` includes `tenantId`.
- Archived facilities/resources excluded at query level.

## Performance / query strategy

For a standard (non-weekplanner) request:

1. One `facilityResource.findMany` for the group.
2. **`Promise.all`**: `findTrainingConflicts`, `findMatchConflicts`, `findTournamentConflicts`, optional weekplanner conflicts.

**No N+1 per resource.** Tournament queries filter `facilityResourceId: { in: candidateResourceIds }`.

## Create / edit route coverage

| Surface | Live availability |
|---------|-------------------|
| Training create | `TrainingSeriesCreateForm` + `useFacilityAvailability` |
| Training session edit | `TrainingSessionAllocationEditor` + `excludeTrainingSessionId` |
| Match create | `MatchCreateForm` |
| Match edit | `MatchcenterDetailOperational` + `excludeEventId` |
| Tournament create | `TournamentCreateForm` (hook or direct API) |
| Saisonplaner tournament | `PlannerTournamentCanonicalWorkspace` |
| TournamentCenter edit | `TurniereTournamentRecordWorkspace` |

**Series default exception:** until `enabled && startAt` (meaningful interval), `useFacilityAvailability` returns empty maps — not live occupancy.

## Regression coverage

- `lib/facilities/__tests__/availability-service.test.ts` — core engine
- `lib/facilities/__tests__/availability-service-cross-event.test.ts` — cross-event + exclusion + boundary proofs (this slice)
- `lib/planning/__tests__/planning-ux-07r4b-cross-event-facility-engine.test.ts` — wiring, routes, tournament merge, docs sentinel

Prior UX slices: UX-07R3, UX-07R4, UX-07R4A, UX-07R2, UX-07R1, UX-07, UX-06, UX-05R2, P0R1 test files remain required green in CI.

## Database safety

This verification slice: **no schema change**, **no migrations**, **no STAGE/production writes**.
