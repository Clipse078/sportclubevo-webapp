# PLANNING-UX-07R6 — Veranstaltung facility allocation

Completes the **fifth domain** of the canonical SportClubEvo facility platform: **Wochenplan**, **Training**, **Match**, **Tournament**, and **Veranstaltung** (Event.type=OTHER) share one time-based facility truth.

## Persistence decision

| Item | Result |
|------|--------|
| Reusable generic model | **No** — `TournamentResourceAllocation` is tournament-scoped; Match uses legacy `Event` code fields |
| New model | **`EventFacilityAllocation`** |
| Rationale | Minimal event → `FacilityResource` link; event time stays on `Event`; no domain-specific columns |

Schema: `tenantId`, `eventId`, `facilityResourceId`, optional `notes` / `displayOrder`, timestamps.  
Unique `[eventId, facilityResourceId]`. Indexes for tenant, event, and resource lookup.

**MATCH legacy persistence is unchanged** in R6 (still `Event.pitchCode` / dressing-room codes for availability reads).

## Migration

- File: `prisma/migrations/20260925120000_planning_ux_07r6_event_facility_allocation/migration.sql`
- Forward-only `CREATE TABLE` + indexes + FKs
- **Not applied to STAGE or production** in this package

## Write service

`lib/events/event-facility-allocation-service.ts` (Event.type=OTHER only):

| Operation | Function |
|-----------|----------|
| List | `listEventFacilityAllocations` |
| Assign | `assignEventFacilityResource` |
| Unassign | `unassignEventFacilityResource` |
| Replace | `replaceEventFacilityResource` |

API: `GET/POST /api/events/[eventId]/facility-allocations`, `DELETE/PATCH .../[allocationId]`.

Shared validation: `lib/facilities/facility-resource-write-validation.ts` (tenant, archive, PITCH_HALL / DRESSING_ROOM groups).  
Resource types in live availability: `FULL_PITCH`, `HALF_PITCH`, `DRESSING_ROOM` — not `OTHER`.

Permissions: existing Veranstaltung `EVENTS_VIEW` / `EVENTS_MANAGE` — no facility bypass.

## Canonical read engine

```
GET /api/facilities/availability
  → getResourceAvailability
  → findVeranstaltungConflicts (EventFacilityAllocation + Event.type=OTHER)
  → timeRangesOverlap
  → owner label = Event.title
```

**Query strategy:** one set-based `eventFacilityAllocation.findMany` filtered by `tenantId`, candidate `facilityResourceId`s, and `event.type=OTHER`; overlap and group classification in memory — no N+1 owner lookups.

**Exclusion:** reuse `excludeEventId` — current Veranstaltung edit excludes only its own event id; other events and all other domains remain visible.

## Wochenplan

- `collectVeranstaltungOccupants` in `lib/weekplanner/availability-integration.ts` when `weekplannerPlanId` is set (plan-aware path)
- Global path uses `findVeranstaltungConflicts` when no effective-plan substitution
- `lib/weekplanner/queries.ts` maps Veranstaltung items from `eventFacilityAllocations` (legacy codes remain fallback only)

**WOCHENPLAN_SEES_VERANSTALTUNG = YES**

## Veranstaltung create / edit UX

- **Create:** `VeranstaltungCreateForm` — resources section after schedule; `PlanningSingleResourceAssignment` + `useFacilityAvailability`; drafts persisted via POST allocation API after event create
- **Edit:** primary column — details → **resources** → participants → work → collaboration; right rail unchanged (publication / RSVP)
- Pitch/hall and dressing room: event-level assignment (no Heim/Gast semantics)
- Incomplete date/time: availability hook disabled (neutral maps)

## Cross-domain matrix

| Key | Mechanism |
|-----|-----------|
| MATCH_SEES_VERANSTALTUNG | `findVeranstaltungConflicts` in match picker window |
| TRAINING_SEES_VERANSTALTUNG | same |
| TOURNAMENT_SEES_VERANSTALTUNG | same |
| WOCHENPLAN_SEES_VERANSTALTUNG | plan collector + global branch |
| VERANSTALTUNG_SEES_TRAINING | `findTrainingConflicts` |
| VERANSTALTUNG_SEES_MATCH | `findMatchConflicts` |
| VERANSTALTUNG_SEES_TOURNAMENT | `findTournamentConflicts` |
| VERANSTALTUNG_SEES_VERANSTALTUNG | `findVeranstaltungConflicts` |

Groups: **PITCH_HALL**, **DRESSING_ROOM**. Tests cover overlap, non-overlap, boundary, current-event exclusion, tenant isolation, archived rejection, occupied remains selectable.

## Occupancy contract

Unchanged UX-07R3: **OCCUPIED ≠ DISABLED** — sharing allowed; owner shown first (`Event.title`).

## Performance

Single bounded allocation query per availability request (plus existing sources). No per-resource or per-event query loops.

## Publication / SFV

No changes to publication defaults or SFV sync (UX-05R2 / UX-06 / UX-07 contracts preserved).
