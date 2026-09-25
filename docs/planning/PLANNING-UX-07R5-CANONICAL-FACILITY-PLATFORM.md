# PLANNING-UX-07R5 — Canonical facility allocation platform

**Authoritative architecture document** for SportClubEvo facility planning. Supersedes UX-07R4 / R4A / R4B as the single reference for read/write boundaries, cross-domain occupancy, and active UX contracts.

Prior slices:

- **R4B** — verified cross-event **read** engine (`getResourceAvailability`).
- **R5** — consolidates **write** validation, Wochenplan picker parity, lifecycle semantics, and architecture sentinels — **without** replacing the read engine.
- **R6** — closes the Veranstaltung gap via `EventFacilityAllocation` (see `PLANNING-UX-07R6-VERANSTALTUNG-FACILITY-ALLOCATION.md`) — **five domains complete**.

## Layer model

| Layer | Responsibility | R5 status |
|-------|----------------|-----------|
| **A — Canonical persistence** | `TrainingAllocation`, `TrainingSessionAllocation`, Match `Event` codes, `TournamentResourceAllocation`, `TournamentParticipantAllocation`, `EventFacilityAllocation` (R6), `WeekplannerPlanAllocation` | No forced single table |
| **B — Canonical facility engine** | `getResourceAvailability` + `timeRangesOverlap` | **Frozen** — do not duplicate |
| **C — Shared planning UX** | `PlanningResourceAssignment*`, `PlanningResourcePicker`, `PlanningSingleResourceAssignment` | Wochenplan override editor migrated to picker |

## R4B verified baseline (read)

```
GET /api/facilities/availability
  → getResourceAvailability
  → Promise.all [
       findTrainingConflicts,
       findMatchConflicts,
       findTournamentConflicts,
       findVeranstaltungConflicts,
       findWeekplannerPlanConflicts? (when weekplannerPlanId set)
     ]
  → timeRangesOverlap / resourceOccupancyWindowsOverlap
  → normalized FREE | OCCUPIED + owner labels
```

Resource groups: `FULL_PITCH`, `HALF_PITCH`, `HALL` (via PITCH_HALL), `DRESSING_ROOM`.  
`FacilityResourceType.OTHER` is **intentionally outside** live planning availability groups.

## Write-path architecture

| Domain | Create | Edit | Unassign | Persistence | Tenant + resource validation |
|--------|--------|------|----------|-------------|------------------------------|
| **Wochenplan** | — | `POST/DELETE /api/weekplanner/plans/[planId]/allocations` | DELETE allocation row | `WeekplannerPlanAllocation` | `lib/weekplanner/plan-service.ts` + **shared** `facility-resource-write-validation` |
| **Training series** | training allocation API | series allocations page | DELETE allocation | `TrainingAllocation` | `training-allocation-service` + shared validation |
| **Training session** | session allocation API | `TrainingSessionAllocationEditor` | DELETE override row | `TrainingSessionAllocation` | `session-allocation-service` + shared validation |
| **Match** | `MatchCreateForm` / match API | `MatchcenterDetailOperational` | clear codes / API | `Event.pitchCode`, `*DressingRoomCode` | matchcenter services (legacy codes → resource by code) |
| **Tournament** | create + allocation APIs | Saisonplaner + TournamentCenter | DELETE allocation rows | `TournamentResourceAllocation`, `TournamentParticipantAllocation` | tournament *-allocation-service + shared validation |
| **Veranstaltung** | create + allocation APIs | edit form + allocation editor | DELETE/PATCH allocation | `EventFacilityAllocation` (R6) | `event-facility-allocation-service` + shared validation |

Shared write primitives (`lib/facilities/facility-resource-write-validation.ts`):

- `loadTenantFacilityResourceForWrite`
- `validateAssignableFacilityResource` (tenant row, not archived)
- `validateFacilityResourceAllocationGroup` (PITCH_HALL vs DRESSING_ROOM)

Domain services retain domain errors and persistence; they must not invent conflicting archive or tenant rules.

## Wochenplan lifecycle and bidirectional contract

**Standardplan** = canonical persisted allocations (no `WeekplannerPlan` row).

**Alternative plans** = sparse `WeekplannerPlanAllocation` overrides per activity/group/(participant).

| State | Facility occupancy in global engine |
|-------|-------------------------------------|
| Draft / inactive alternative plan | **Not** exposed to Training/Match/Tournament editors (no `weekplannerPlanId` on their availability calls) |
| Plan editing UI | Passes `weekplannerPlanId` + activity exclusions → **effective** occupancy via `findWeekplannerPlanConflicts` (canonical baseline + overrides, de-duplicated via `findWeekplannerReplacedActivities`) |
| Operationally active plan (`WeekplannerPlan.isActive` / linked `WochenplanPlan.isActive`) | Drives **public** week display (Infoboard, website feed) via `getWeekplannerDay`; canonical DB rows remain source for cross-module editors unless overridden in that active plan’s effective resolution |

**A. Wochenplan sees canonical events:** effective-plan collector includes Training, Match, Tournament with override resolution.  
**B. Other modules see Wochenplan:** only through **canonical persistence** (overrides are plan-scoped until reflected in canonical models or consumed with explicit `weekplannerPlanId`). Draft alternative plans do not pollute global availability.

Active UX: `WeekplannerAllocationOverrideEditor` → `PlanningResourcePicker` + `GET /api/facilities/availability` with plan context.

## Training / Match / Tournament

Unchanged R4B cross-domain read proofs. Writes use shared resource validation where allocations bind to `FacilityResource` ids.

Occurrence-based training flows: live availability with `excludeTrainingSessionId`.  
Series defaults without concrete interval: `useFacilityAvailability` disabled (`enabled && !!startAt`).

Match: Heim/Gast presentation via `PlanningMatchDressingRoomAssignments`; state from engine.  
Tournament: participant CURRENT/SHARED merge in presentation layer only.

## Veranstaltung — completed in R6

R5 documented the gap; **R6** adds `EventFacilityAllocation`, write APIs, `findVeranstaltungConflicts`, Wochenplan collector integration, and shared create/edit resource UX. See **PLANNING-UX-07R6-VERANSTALTUNG-FACILITY-ALLOCATION.md**.

## Occupancy contract (UX-07R3)

| State | UI label |
|-------|----------|
| FREE | Frei |
| CURRENT | current assignment / owner |
| OCCUPIED | owner label |
| SHARED | Geteilt mit … |

Occupied resources remain selectable where policy allows intentional sharing.

## Exclusion semantics

Preserved from R4B: `excludeEventId`, `excludeTrainingSessionId`, tournament participant re-injection, weekplanner activity exclusions. Excluding CURRENT must not hide unrelated overlaps.

## Performance

Standard request: one resource list query + `Promise.all` on bounded domain queries (no per-resource N+1).  
Weekplanner plan request: effective-plan collector replaces parallel canonical queries for that HTTP call to avoid double counting.

## Authorization / tenancy

`tenantId` from session only. All allocation reads/writes scoped by tenant.

## Publication / SFV

No changes in R5 — publication flags and SFV resync behaviour preserved.

## Architecture sentinel

`lib/planning/__tests__/planning-ux-07r5-canonical-facility-platform.test.ts` guards:

- Active surfaces use `/api/facilities/availability` or `useFacilityAvailability`
- Wochenplan uses `PlanningResourcePicker` (not legacy `FacilityResourceSelector` mount)
- No second overlap engine in availability service

## Create / edit route matrix

See R4B table; R5 adds Wochenplan override editor to shared picker family.

## Database safety

**SCHEMA_CHANGE = NO · MIGRATION = NO**

## Related documents

- [PLANNING-UX-07R4B-CROSS-EVENT-FACILITY-ENGINE.md](./PLANNING-UX-07R4B-CROSS-EVENT-FACILITY-ENGINE.md) — read contract proofs
- [PLANNING-UX-07R4-UNIFIED-RESOURCE-ASSIGNMENT-UX.md](./PLANNING-UX-07R4-UNIFIED-RESOURCE-ASSIGNMENT-UX.md) — shared UX components
