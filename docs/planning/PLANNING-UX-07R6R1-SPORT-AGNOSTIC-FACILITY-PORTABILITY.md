# PLANNING-UX-07R6R1 — Sport-agnostic facility resource portability

Hardness pass on the canonical facility platform so **SportClubEvo is not architecturally bound to football**. FC Allschwil remains a reference tenant, not the domain model.

Related:

- **R5** — `PLANNING-UX-07R5-CANONICAL-FACILITY-PLATFORM.md`
- **R6** — `PLANNING-UX-07R6-VERANSTALTUNG-FACILITY-ALLOCATION.md`

## 1. Current FacilityResource model

```
Tenant → Facility → FacilityResource
```

| Field | Role |
|-------|------|
| `id` | Canonical allocation identity |
| `tenantId` | Strict multi-tenancy |
| `facilityId` | Physical site grouping |
| `name`, `code` | Tenant-defined labels |
| `type` | `FacilityResourceType` enum (configuration, not sport engine) |
| `status`, `sortOrder` | Lifecycle / UX ordering |

No sport-specific columns. All allocation tables reference `facilityResourceId`.

## 2. Sport-agnostic architecture decision

**YES** — the existing schema is sufficiently generic. Football-specific values live in `FacilityResourceType` as **category hints**, not as separate persistence models.

R6R1 refactors **classification, validation, and availability grouping** so the engine reasons about **tenant + resource id + time**, not “pitch-only” semantics.

No additional schema migration in R6R1.

## 3. Type / category semantics

| `FacilityResourceType` | Meaning (category) | Availability group |
|------------------------|--------------------|--------------------|
| `FULL_PITCH` | Full primary playable surface (football naming) | `PITCH_HALL` |
| `HALF_PITCH` | Subdivision / section of a playable surface | `PITCH_HALL` |
| `DRESSING_ROOM` | Changing room | `DRESSING_ROOM` |
| `OTHER` | Generic bookable resource (court, room, lane, …) | `OTHER` |

**Capability / usage** (tennis vs basketball on the same court) is **not** modeled in R6R1 — tenants use resource records and names; no per-sport enum explosion.

Implementation: `lib/facilities/facility-resource-classification.ts`, `lib/training/allocation-groups.ts`.

## 4. Grouping semantics

| Group key | Product label (DE) | Sport-agnostic role |
|-----------|-------------------|---------------------|
| `PITCH_HALL` | Spielfeld / Halle | Primary **playable** surfaces |
| `DRESSING_ROOM` | Garderobe | Changing rooms |
| `OTHER` | Weitere Ressourcen | Other bookable resources |

`PITCH_HALL` is a **legacy compatibility alias** for the primary playable group — not “football only”. Tennis courts configured as `OTHER` use the `OTHER` availability group with the **same** conflict engine.

## 5. Subdivision semantics (FULL / HALF)

There is **no** parent/child FK on `FacilityResource`. Subdivisions are:

- Separate resources sharing a `facilityId`
- Derived occupancy rules in `getResourceAvailability` when `group === PITCH_HALL` and both `FULL_PITCH` and `HALF_PITCH` exist in one facility

| Assessment | Result |
|------------|--------|
| Generic enough for hall sections / rink sections? | **Partially** — same pattern (sibling resources + rules) could extend later |
| Football-specific debt? | **Naming** (FULL/HALF) only |
| Future migration? | Optional explicit parent/child — **not required** for multi-sport tenants using `OTHER` or separate full resources |

## 6. Canonical availability contract

```
GET /api/facilities/availability?group=PITCH_HALL|DRESSING_ROOM|OTHER
  → getResourceAvailability({ tenantId, startAt, endAt, group })
  → candidate FacilityResources filtered by group types
  → Promise.all domain conflict finders (resource-id based)
  → FREE | OCCUPIED per resource id
```

**Sport dependency:** none at aggregation layer.

## 7. EventFacilityAllocation portability

R6 model remains unchanged:

- `eventId` + `facilityResourceId` (+ notes / displayOrder)
- No pitch/hall columns

**R6R1 write change:** Veranstaltung may assign **any** known `FacilityResourceType`, including `OTHER` (generic courts/rooms). Validation = tenant + archive + known type — not “football types only”.

## 8. Write validation

| Domain | Group enforcement |
|--------|-------------------|
| Training / Tournament / Wochenplan override | `validateFacilityResourceAllocationGroup` (PITCH_HALL vs DRESSING_ROOM) |
| Veranstaltung (`EventFacilityAllocation`) | Assignable resource only — **no** PITCH_HALL-only restriction |

Shared primitives: `lib/facilities/facility-resource-write-validation.ts`.

## 9. Football legacy adapters

| Domain | Adapter |
|--------|---------|
| **Match** | `Event.pitchCode`, `homeDressingRoomCode`, `awayDressingRoomCode` → resolved to resources in `findMatchConflicts` |
| **Training / Tournament / Veranstaltung** | ID-based allocation tables |

Legacy match fields are **unchanged** in R6R1.

## 10. Generic UI architecture

Shared planning components consume **availability maps** and resource metadata — domain screens may keep football labels (“Spielfeld”) where appropriate.

Wochenplan continues to use `PITCH_HALL` / `DRESSING_ROOM` override groups (product scope); global occupancy still flows through `getResourceAvailability`.

## 11. Future sports examples

| Tenant | Facility | Resources (examples) | Types |
|--------|----------|----------------------|-------|
| Football club | Im Brüel | Kunstrasen 2, Sporthalle, Garderobe O1 | FULL_PITCH, HALF_PITCH, DRESSING_ROOM |
| Tennis club | Tennisanlage West | Court 1–3, Garderobe Damen/Herren | OTHER, DRESSING_ROOM |
| Ice hockey | Eissportzentrum | Rink A/B, Garderobe 1/2 | OTHER (or dedicated types later), DRESSING_ROOM |

Same engine: resource ids + intervals + cross-domain conflicts.

## 12. Known technical debt

- Enum labels `FULL_PITCH` / `HALF_PITCH` are football-centric naming (acceptable as configuration).
- No explicit resource hierarchy table (sibling inference only).
- Live UX still emphasizes PITCH_HALL + DRESSING_ROOM pickers for Veranstaltung; `OTHER` group is API-ready for extended pickers.
- Match normalization to `EventFacilityAllocation` — out of scope.

## 13. Migration decision

| Item | Value |
|------|-------|
| Migration | `20260925120000_planning_ux_07r6_event_facility_allocation` |
| R6R1 schema change | **None** |
| Migration file changed | **No** |
| Applied to STAGE/production in R6R1 | **No** |

## Five-domain contract (unchanged)

WOCHENPLAN, TRAINING, MATCH, TOURNAMENT, VERANSTALTUNG share `getResourceAvailability` + write validation boundaries documented in R5/R6.
