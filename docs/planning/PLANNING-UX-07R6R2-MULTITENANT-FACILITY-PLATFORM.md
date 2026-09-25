# PLANNING-UX-07R6R2 — Multi-tenant self-service facility platform

Extension of the canonical facility platform (R5 → R6 → R6R1) proving that **facility inventory is tenant data**, not application code. SportClubEvo supports **1..N tenants**, each with **1..N facilities** and **1..N bookable resources per facility**, with **0..N allocations over time** per resource.

Related:

- **R5** — `PLANNING-UX-07R5-CANONICAL-FACILITY-PLATFORM.md`
- **R6** — `PLANNING-UX-07R6-VERANSTALTUNG-FACILITY-ALLOCATION.md`
- **R6R1** — `PLANNING-UX-07R6R1-SPORT-AGNOSTIC-FACILITY-PORTABILITY.md`

## 1. Hierarchy

```
SportClubEvo
  └── Tenant (1..N)
        └── Facility (1..N)
              └── FacilityResource (1..N)
                    └── Allocations (0..N over time)
```

FC Allschwil is a **reference tenant only** — the engine never assumes football-specific inventory.

## 2. Ownership rules

| Entity | Rule |
|--------|------|
| `Facility` | Exactly one `tenantId`; all reads/writes include tenant scope |
| `FacilityResource` | Exactly one `tenantId`; must reference a `Facility` owned by the same tenant |
| Allocations | Validate `facilityResourceId` via `loadTenantFacilityResourceForWrite(tenantId, id)` |
| Identity | **`FacilityResource.id`** for authorization and allocation — never display name, code, or sport |

Client-supplied `tenantId` never establishes authorization; **`activeTenantId` from session** does.

## 3. CRUD architecture (self-service)

Authorised tenant administrators manage inventory without deployments or per-resource migrations.

| Operation | Facility | FacilityResource |
|-----------|----------|------------------|
| List | `GET /api/facilities` → `getFacilitiesForTenant` | `GET /api/facilities/[facilityId]/resources` |
| Create | `POST /api/facilities` | `POST /api/facilities/[facilityId]/resources` (facility ownership check) |
| Edit | `PATCH /api/facilities/[facilityId]` | `PATCH /api/facilities/[facilityId]/resources/[resourceId]` |
| Archive | `status: ARCHIVED` via PATCH | `status: ARCHIVED` via PATCH |

**UI:** Admin → **Anlagen & Ressourcen** (`FacilitiesAdminPanel`) loads tenant-scoped data server-side and mutates via the APIs above.

## 4. Permissions

| Permission | Use |
|------------|-----|
| `facilities.view` | Read facilities/resources |
| `facilities.manage` | Create/update/archive facilities and resources |
| `facilities.delete` | Permanent delete (separate destructive flows) |

Normal club users without `facilities.manage` cannot mutate inventory.

## 5. Resource auto-discovery

Once a valid `FacilityResource` row exists for a tenant:

1. `getFacilitiesForTenant(tenantId)` returns it in planning surfaces.
2. Domain pickers (`PlanningResourcePicker`, `PlanningSingleResourceAssignment`) render tenant groups.
3. `GET /api/facilities/availability` → `getResourceAvailability` includes it for the matching availability group (`PITCH_HALL`, `DRESSING_ROOM`, `OTHER`).
4. Allocation services accept the resource id after shared write validation.

**No static allowlist.** Adding “Court 7” is a data change only.

## 6. Domain policy vs engine capability

The **engine is generic**. Workflows may expose subsets:

| Domain | Typical UX groups |
|--------|-------------------|
| Wochenplan | Pitch/hall + dressing (canonical availability) |
| Training | Pitch/hall, dressing, **Weitere Ressourcen (OTHER)** |
| Match | Pitch + home/away dressing (legacy codes + availability) |
| Tournament | Multi pitch/hall selection |
| Veranstaltung | Sportfläche, Garderobe, **Weitere Ressourcen (OTHER)** |

R6R2 adds **OTHER** to Veranstaltung create/edit using the same `PlanningResourcePicker` as Training.

## 7. Resource types (portability)

Canonical types remain: `FULL_PITCH`, `HALF_PITCH`, `DRESSING_ROOM`, `OTHER`.

Tenant-defined courts, rinks, lanes, and rooms typically use **`OTHER`** until optional richer metadata exists. Availability groups are defined in `lib/facilities/facility-resource-classification.ts`.

## 8. Tenant isolation

All list/create/edit/archive/allocation/occupancy paths must fail closed when a resource or facility belongs to another tenant. Cross-tenant resource IDs yield **404 / not found**, not partial leakage.

Regression coverage: `planning-ux-07r6r2-multitenant-facility-platform.test.ts` and `app/api/facilities/[facilityId]/resources/__tests__/route.test.ts`.

## 9. Scale / cardinality

Queries are shaped as:

- `tenantId` + optional facility/resource scope + time interval
- Bounded `findMany` on `FacilityResource` per availability group
- Per-domain conflict queries filtered by `tenantId`

Avoid global scans and cross-tenant reads. Facility list includes resources in one query (admin UI); availability loads resources once per request then merges conflicts.

## 10. Known debt

- **Resource subdivisions:** No generic parent/child hierarchy in R6R2; model separate bookable units as separate resources.
- **Match legacy:** `Event.pitchCode`, `homeDressingRoomCode`, `awayDressingRoomCode` remain; canonical availability adapts without normalising Match persistence in R6R2.

## 11. Migration decision

**No schema change in R6R2.**

R6 migration `20260925120000_planning_ux_07r6_event_facility_allocation` remains **unapplied on STAGE** until controlled review. Checksum:

`0be5c70a40d86edd01e19dd866065b79f6e50d46d093ca30b59d2bd303768ef1`

Self-service facility/resource CRUD uses existing `Facility` / `FacilityResource` tables only.
