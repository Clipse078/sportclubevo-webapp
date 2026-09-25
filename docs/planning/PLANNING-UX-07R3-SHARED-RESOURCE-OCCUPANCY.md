# PLANNING-UX-07R3 — Shared resource occupancy visibility

## Product rule

Resource options must answer: **who is already using this resource in the relevant time window?**

Occupancy is **informational**. Canonical domain validation (conflicts, sharing rules) is unchanged.

**Occupied does not mean disabled.** Users may still select an occupied resource when domain rules allow shared allocation (e.g. two tournament teams sharing one dressing room).

## Semantics

| State | Presentation |
| --- | --- |
| **FREE** | Existing positive `Frei` treatment |
| **OCCUPIED** | Owner display name(s) — never `Frei` when an overlapping allocation exists |
| **CURRENT** | Viewing subject holds the allocation — name + selection checkmark |
| **SHARED** | Multiple subjects on the same resource — compact label (e.g. `Geteilt mit …`) without error styling |

## Time overlap

Uses `lib/facilities/availability-service.ts` and `timeRangesOverlap` from `lib/facilities/allocation-rules.ts`:

`existing.start < current.end AND existing.end > current.start`

No second competing overlap engine.

## Architecture

```
GET /api/facilities/availability  (canonical)
        ↓
lib/planning/resource-occupancy-presentation.ts  (merge + normalize)
        ↓
CompactOperationalResourceSelector / formatAvailabilitySuffix
        ↓
Training · Match · Tournament surfaces
```

### Tournament per-team dressing rooms

`excludeEventId` on edit excludes the whole tournament from the availability API (so the event does not conflict with itself). Cross-team dressing-room occupancy is merged **in memory** from the loaded participant list via `mergeTournamentParticipantDressingRoomAvailability` — one API fetch, shared dataset, per-participant view maps.

### Match / training

Matchcenter and Training session allocation consume the availability hook directly; labels use `formatResourceOccupancyPrimaryLine`.

### Authorization

Availability remains tenant-scoped server-side. The merge layer only uses participant data already loaded in the active planning context — no cross-tenant or IDOR lookups.

## Performance

No per-resource or per-participant API loops. Tournament rows share one base availability map and one in-memory merge per participant id.

## Regression coverage

`lib/planning/__tests__/planning-ux-07r3-shared-resource-occupancy.test.ts` plus existing UX-06 / UX-07 / UX-07R1 / UX-07R2 suites.

## Database

**No schema change.** Derived from existing allocation and availability data only.
