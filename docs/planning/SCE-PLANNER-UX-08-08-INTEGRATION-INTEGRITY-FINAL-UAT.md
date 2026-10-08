# SCE-PLANNER-UX-08-08 — Integration, Integrity & Final UAT Hardening

**Status:** **HUMAN_UAT_READY** — **08-08F** automated release baseline green; **Human UAT pending** (FACILITY-INTEGRITY-01 not fully CLOSED)  
**08_08A_STATUS:** **COMPLETE**  
**08_08B_STATUS:** **COMPLETE**  
**08_08C_STATUS:** **COMPLETE**  
**08_08C_R1_STATUS:** **COMPLETE** (F-08-08-03 → FIXED_COMPATIBILITY_LAYER)  
**08_08D_STATUS:** **COMPLETE**  
**08_08F_STATUS:** **COMPLETE** — test harness green; **0** production behavior changes  
**FACILITY_INTEGRITY_01:** **AUTOMATED_GATE_PASS / HUMAN_UAT_PENDING** (not CLOSED)  
**08_08_STATUS:** **HUMAN_UAT_READY** (not CLOSED until Human UAT + gates)  
**Branch:** `cursor/sce-planner-ux-08-08-integration-integrity-final-uat-a6e2`  
**HEAD (08-08D):** see git — post-integration commit on this branch  
**Base (STAGE):** `82d7b7b0e53bcf93642735dc7330eefb3b93d330` (merge PR #805 / 08-07 closure)  
**Target:** STAGE  
**PROD:** untouched  

---

## 1. Preflight

| Field | Value |
|-------|--------|
| **BRANCH_BEFORE** | `STAGE` |
| **LOCAL_STAGE_BEFORE** | `82d7b7b0e53bcf93642735dc7330eefb3b93d330` |
| **ORIGIN_STAGE** | `82d7b7b0e53bcf93642735dc7330eefb3b93d330` |
| **EXPECTED_08_07_BASELINE** | `82d7b7b0e53bcf93642735dc7330eefb3b93d330` |
| **08_07_CONTAINED** | YES — HEAD is merge commit for PR #805 |
| **PR_805_CONTAINED** | YES |
| **PR_803_CONTAINED** | YES — `7bf854d4` (FACILITY-INTEGRITY-01A) is ancestor |
| **STAGE_ADVANCEMENT** | None — origin/STAGE equals expected baseline |
| **DRIFT_CLASSIFICATION** | `NONE` |
| **NEW_BRANCH** | `cursor/sce-planner-ux-08-08-integration-integrity-final-uat-a6e2` |
| **WORKTREE** | clean |
| **PROD_UNTOUCHED** | YES |

### Package containment on STAGE (merge evidence)

| Package | PR / evidence |
|---------|----------------|
| SCE-PLANNER-UX-08-01 | #797 `a68f44c8` |
| 08-02 | #798 `95ba8db7` |
| 08-03 | #800 `595cd1fb` |
| 08-04 | #801 `aec52552` |
| 08-05 | #802 `7137b872` (feat commit on STAGE) |
| 08-06 | #804 `a1027822` |
| 08-07 | #805 `82d7b7b0` — doc **CLOSED** |
| FACILITY-INTEGRITY-01A | #803 `7bf854d4` — **CLOSED** |

---

## 2. Planner architecture — data-flow map

Canonical read pipeline (all activity types):

```
Domain persistence (tenant-scoped)
  → lib/weekplanner/queries.ts (getWeekplannerWeek)
  → WeekplannerItem[] (in-memory, per request)
  → lib/weekplanner/view-model.ts (buildWeekplannerWeek)
  → annotateWeekplannerConflicts (server-derived, not persisted)
  → enrichWeekplannerItemDressingRoomOccupancy (buffers)
  → WeekplannerWeek
  → getWeekplannerWeekCached (React cache(), request-scoped dedupe)
  → Planning Hub perspectives + Liste + inspectors
```

### TRAINING

| Stage | Location / identity |
|-------|---------------------|
| **Source** | `TrainingSession` via `listTrainingSessionsForWeekplanner` / `findAllTrainingSessionsForWeekplanner` |
| **Canonical activity key** | `TRAINING:{trainingSessionId}` (`weekplannerCanonicalActivityKey`) |
| **Weekplanner id** | `training:{session.id}` |
| **trainingSessionId** | `WeekplannerTrainingItem.trainingSessionId` |
| **teamSeasonId** | `WeekplannerTrainingItem.teamSeasonId` |
| **Allocations** | `TrainingAllocation` (series) + `TrainingSessionAllocation` (occurrence override) → `facilityResourceId` |
| **Time** | Session `startAt`/`endAt`; plan overrides via `WeekplannerPlanActivityOverride` |
| **Conflicts** | Occupancy windows on pitch + dressing refs (`collectWeekplannerOccupiedResources`) |
| **Filtering** | `lib/planning-hub/team-filter.ts`, URL `typ` / `team` / `facility` / `konflikte` |
| **Mutations** | Training APIs, planning-grid reassign, hub manipulation → `revalidatePlannerWeekPaths()` + client `router.refresh()` / `applyTrainingCancellationToPlannerWeek` |
| **CANCELLED** | Excluded at query boundary (`status notIn CANCELLED, RECURRENCE_REMOVED`) — 08-07R5 |

### MATCH

| Stage | Location / identity |
|-------|---------------------|
| **Source** | `Event(type=MATCH)` via `listMatchcenterMatches` — **HOME only** |
| **Canonical key** | `MATCH:{eventId}` |
| **Provider identity** | `eventSource` on `WeekplannerMatchItem`; SFV authority enforced in match/training mutation paths (08-03/04 tests) |
| **teamSeasonId** | `resolveWeekplannerMatchTeamSeasonId` — hub team filter (08-06R2) |
| **Pitch / dressing** | Legacy `Event.pitchCode`, `homeDressingRoomCode`, `awayDressingRoomCode` resolved to `WeekplannerResourceRef` by **code** (same as availability-service) |
| **Mutations** | Matchcenter / event routes — not training-session PATCH |
| **Seam** | Dual model: FK allocations for training/tournament/event vs **code snapshots** on Match |

### TOURNAMENT

| Stage | Location / identity |
|-------|---------------------|
| **Source** | `listTournaments` — HOME only |
| **Canonical key** | `TOURNAMENT:{eventId}` |
| **teamSeasonIds** | `WeekplannerTournamentItem.teamSeasonIds` |
| **Allocations** | `TournamentResourceAllocation` (pitch) + `TournamentParticipantAllocation` (dressing per participant) by `facilityResourceId` |
| **Plan overrides** | `WeekplannerPlanAllocation` per participant dressing group |

### VERANSTALTUNG (club event)

| Stage | Location / identity |
|-------|---------------------|
| **Source** | `Event(type=OTHER)` + `EventFacilityAllocation` |
| **Canonical key** | `VERANSTALTUNG:{eventId}` |
| **teamSeasonId** | Optional on item |
| **allDay** | Multi-day bucket via `allDayInclusiveDayKeys` in view-model |

### Resource identity fields (WeekplannerResourceRef)

- **Canonical:** `facilityResourceId`, `facilityId`, `code`, `name`, `facilityName`, `resourceType`
- **Occupancy buffers:** `occupancyBeforeMinutes` / `occupancyAfterMinutes` (pitch); dressing uses item-level resolved buffers after enrichment

### Conflict model

- **Persisted:** none (conflicts are annotations on read model)
- **Computed:** `lib/weekplanner/conflict-detection.ts` — pairwise O(n²), pitch capacity hierarchy via `facilityResourcesShareConflictCapacity`
- **Cached:** only inside the request’s `WeekplannerWeek` payload; invalidated when `revalidatePath` + RSC refresh or client reconciliation (08-07R5)
- **Consumers:** Kalender/Spielfeld/Garderobe geometry, conflict workspace, aggregate metrics — all read `item.conflicts[]` from same week payload

### Availability model

- **Source:** `lib/facilities/availability-service.ts` + `lib/weekplanner/availability-integration.ts`
- **IDs:** same `facilityResourceId` as weekplanner refs for training/tournament/event; match uses code resolution
- **Active selectors:** `getActiveResourceOptionsForTenant` excludes ARCHIVED facility/resource

### Cache / revalidation model

| Mechanism | Scope |
|-----------|--------|
| `getWeekplannerWeekCached` | React `cache()` — dedupe within one RSC request |
| `getFacilitiesForTenantCached` | React `cache()` — facility catalog per request |
| `revalidatePlannerWeekPaths()` | `/dashboard/planner/week`, `/dashboard/planner/day` |
| `revalidateAfterSuccessfulFacilityMutation()` | **08-08B** — planner week/day + `/dashboard/admin/facilities` after successful facility/resource writes |
| `POST /api/planning-hub/planner-revalidate` | Same paths; permissions include `TRAININGS_MANAGE` (08-07R5) — **not** required for facility admin revalidation |
| Client | `PlanningHubManipulationContext` → fetch revalidate + `router.refresh()`; cancellation → `applyTrainingCancellationToPlannerWeek` |
| Client facility catalog | **08-08B** — `WeekPlannerWorkspace` prefers server `resourceTimelineCatalog`; lazy fetch resets via `resetPlanningHubFacilityGroupsClientFetch()` on RSC refresh / week identity change |

---

## 3. FACILITY-INTEGRITY-01 — lifecycle gate (01A closed; broader scope open)

**01A:** CLOSED — do not reopen FCA Hauptfeld consolidation (PR #803).

### Propagation summary (pitches & dressing rooms)

| Operation | Admin DB | Selectors (new assign) | Planner labels (next full load) | Open planner without refresh | Conflicts / availability | Delete safety |
|-----------|----------|------------------------|-----------------------------------|------------------------------|--------------------------|---------------|
| **Create** | PASS | PASS (active query) | PASS on navigation | UNPROVEN — lazy facility-groups cache | PASS next read | n/a |
| **Rename** | PASS | PASS | PASS on RSC refresh | **P2** — no revalidatePath from `/api/facilities/*` | PASS next read (names from DB) | n/a |
| **Archive/deactivate** | PASS | PASS (excluded from active) | Historical refs via `withRequiredCodes` | UNPROVEN | PASS next read | Preferred over delete |
| **Delete** | PASS (blocked when referenced) | PASS | Links **preserved** when blocked | N/A | Next read consistent | **PASS** — 08-08A guards + RESTRICT FK |

### Dressing vs pitch parity

- Same `FacilityResource` model, same allocation FKs (**RESTRICT** on delete since 08-08A), same `getActiveResourceOptionsForTenant` grouping (`DRESSING_ROOM` vs `PITCH_HALL`)
- Same planner conflict collection paths (dressing includes match away + tournament participants)

### Legacy seams (still on STAGE)

- **STADION_*** codes on canonical Hauptfeld facility (01A intentional stable codes)
- **Event.pitchCode** string snapshots for matches (not FK)
- Infoboard Screen-2 preview resolver: HAUPTFELD vs STADION ambiguity guard (`lib/infoboard/screen2-preview-facility-resolver.ts`)
- Residual **duplicate facility row** risk for distinct names (e.g. Hauptfeld vs Hauptplatz) — 08-08A blocks same `(tenant, normalized name, type)`; legacy Class B pair unchanged

---

## 3A. SCE-PLANNER-UX-08-08A — facility lifecycle canonicalization (this branch)

### Canonical lifecycle semantics

| State | Behavior |
|-------|----------|
| **ACTIVE** | Available for new assignment (`getActiveResourceOptionsForTenant`, `validateAssignableFacilityResource`) |
| **INACTIVE / ARCHIVED** | Hidden from assignable queries; existing FK/code references remain intact |
| **DELETE (physical)** | Allowed only when `_count` of all allocation join tables = 0 for the resource (and for facility: all children unused) |

### Delete safety (F-08-08-01)

- **Service:** `lib/facilities/facility-delete-service.ts` + `lib/facilities/facility-resource-reference-guard.ts`
- **DB backstop:** migration `20261008120000_sce_planner_ux_08_08a_facility_resource_delete_restrict` — allocation → `FacilityResource` FKs `ON DELETE RESTRICT`
- **API:** `/api/facilities/*/permanent` returns **409** `{ code: RESOURCE_IN_USE \| FACILITY_IN_USE }` with German actionable copy
- **Admin UI:** delete confirm disabled when impact counts > 0 (no “success” after stripping links)
- **Protected relations (verified in schema):** `TrainingAllocation`, `TrainingSessionAllocation`, `TournamentResourceAllocation`, `TournamentParticipantAllocation`, `EventFacilityAllocation`, `WeekplannerPlanAllocation` — all tenant-scoped counts

### Duplicate prevention (F-08-08-04 partial)

- **Resource code:** normalize (`trim`, collapse whitespace, uppercase) + `assertFacilityResourceCodeAvailable` on create/update; DB `@@unique([tenantId, code])` retained
- **Facility identity:** reject duplicate active `(tenantId, type, normalized name)` on create — does not merge Hauptfeld/Hauptplatz (distinct names)

### Assignable vs historical queries

| Query | Location | Filter |
|-------|----------|--------|
| Assignable | `getActiveResourceOptionsForTenant`, `getActiveFacilityResourcesByCodesForTenant` | Excludes ARCHIVED resource/facility |
| Historical | `getFacilityResourcesByCodesForTenant`, `withRequiredCodes` | No active-only filter; archived labels merged in selectors |

### Test evidence (08-08A)

```bash
npm run test -- lib/facilities/__tests__/facility-delete-service.test.ts \
  lib/facilities/__tests__/facility-lifecycle-08-08a.test.ts \
  lib/facilities/__tests__/facility-integrity \
  lib/facilities/__tests__/queries.test.ts \
  app/api/facilities/[facilityId]/permanent/__tests__/route.test.ts
```

| Suite | Result |
|-------|--------|
| 08-08A new tests | **PASS** (80 facility-focused incl. above) |
| Focused 08 + integrity (§11) | **184 tests — PASS** |
| Broad sweep (§11) | **14 fail — PRE_EXISTING_DIAGNOSIS_FAILURE (F-08-08-06)**; **0 NEW_08_08A_REGRESSION** |
| Build | **PASS** |

### Remaining gaps (post 08-08B)

- **08-08C:** conflict/availability characterization after archive/delete under open planner (F-08-08-05 adjacent semantics)
- **FACILITY-INTEGRITY-01:** not CLOSED until matrix + 08-08C complete

---

## 3B. SCE-PLANNER-UX-08-08B — facility mutation → planner revalidation (this branch)

### Mutation entry-point inventory

| Route / action | Service | DB mutation | Revalidation (success only) | Client effect |
|----------------|---------|-------------|-----------------------------|---------------|
| `POST /api/facilities` | `createFacility` | `Facility` insert | `revalidateAfterSuccessfulFacilityMutation()` | Admin `router.refresh()`; planner RSC refresh picks up new catalog on next navigation/`router.refresh()` |
| `PATCH /api/facilities/[facilityId]` | `updateFacility` | name/type/status/sort | same | same |
| `DELETE …/permanent?confirm=true` (facility) | `deleteFacilityPermanently` | guarded hard delete | same (preview / 409 → **no** revalidate) | Admin list refresh |
| `POST …/resources` | `createFacilityResource` | `FacilityResource` insert | same | Planner selectors / lanes on refreshed catalog |
| `PATCH …/resources/[resourceId]` | `updateFacilityResource` | rename/code/type/status | same; lifecycle 409 → **no** revalidate | Labels + assignable options |
| `DELETE …/resources/…/permanent?confirm=true` | `deleteFacilityResourcePermanently` | guarded hard delete | same | Unused resource drops from lanes/options after refresh |

No separate admin UI server actions — all writes go through the API routes above.

### Canonical invalidation architecture

- **Boundary:** `lib/planning-hub/facility-mutation-revalidation.ts` → `revalidatePlannerWeekPaths()` + `revalidatePath("/dashboard/admin/facilities")`
- **Not duplicated:** training/match/tournament routes unchanged; facility writes do not call `POST /api/planning-hub/planner-revalidate` (avoids extra permission gate)
- **Failed mutations:** validation errors, duplicate codes, `RESOURCE_IN_USE` / `FACILITY_IN_USE` — DB unchanged, **no** revalidation (08-08A contract preserved)

### Consumer invalidation set

| Consumer | Mechanism |
|----------|-----------|
| Planner week/day RSC | `revalidatePlannerWeekPaths()` |
| Admin facilities page | `revalidatePath("/dashboard/admin/facilities")` |
| `/api/planning-hub/facility-groups` | Dynamic API — fresh on client refetch after planner RSC refresh |
| Training / match / tournament / event create forms | Request-fresh on navigation (SSR facility groups); no broad path sweep in 08-08B |
| Infoboard | **No change** — dynamic DB reads / preview resolver unchanged (FACILITY-INTEGRITY-01A boundary) |

### Open planner client state

| Surface | Ownership | 08-08B behavior |
|---------|-----------|-----------------|
| Week activities | `PlanningHubPlannerWeekProvider` (`serverWeek` → reconciled week) | Unchanged; facility mutations do not use training-cancellation reconciliation |
| Facility/resource groups | `WeekPlannerWorkspace` `serverFacilityCatalog` \| lazy fetch | Server catalog props **replace** stale lazy state; lazy path refetches when `week` identity changes after RSC refresh |
| Selector options in sheets | `manipulationFacilityGroups` | Same catalog pipeline as lanes |

**Archive lane behavior:** archived resources remain on **existing** week items via stored `facilityResourceId` refs; assignable catalog excludes them (`getActiveResourceOptionsForTenant`). Empty lanes for unused archived resources may disappear on refresh — activities keep historical labels on items.

**Resource identity:** renames preserve `facilityResourceId`; tests assert stable id across catalog refresh.

### Tests (08-08B)

```bash
npm run test -- lib/planning-hub/__tests__/facility-mutation-revalidation.test.ts \
  lib/facilities/__tests__/facility-mutation-08-08b.test.ts \
  lib/planning-hub/__tests__/fetch-facility-groups-client.test.ts \
  components/admin/planner/__tests__/WeekPlannerWorkspace.facility-groups-sync.test.tsx \
  app/api/facilities
```

| Suite | Result |
|-------|--------|
| 08-08B new tests | **PASS** (16 + route extensions) |
| 08-08A lifecycle/delete | **PASS** (unchanged) |
| Broad sweep | **14 fail — PRE_EXISTING (F-08-08-06)**; **0 NEW_08_08B_REGRESSION** |
| Build | **PASS** |

### Remaining post-08-08C gaps

- Cross-tab planner auto-refresh without user `router.refresh()` (no broadcast channel in 08-08B)
- Match `pitchCode` seam (F-08-08-03) — P2 deferred; code-rename occupancy gap characterized in 08-08C tests
- Open-planner E2E without browser (08-08D regression pack)

---

## 3C. SCE-PLANNER-UX-08-08C — conflict, availability & historical resource integrity

### Conflict identity model

| Layer | Identity rule |
|-------|----------------|
| **FK-backed allocations** (training, tournament, veranstaltung, plan overrides) | `facilityResourceId` (+ pitch FULL↔HALF hierarchy via `facilityResourcesShareConflictCapacity`) |
| **Presentation** | `name`, `code`, `facilityName` on `WeekplannerResourceRef` — labels only; never compared for pairwise match |
| **Match (legacy)** | `Event.pitchCode` / dressing codes resolved to refs by **code** at read time (`lib/weekplanner/queries.ts` + `availability-service.ts#findMatchConflicts`) |
| **Persisted conflicts** | None — `annotateWeekplannerConflicts` recomputes from in-memory `WeekplannerItem[]` |

Lifecycle operations on the **catalog row** (archive, inactive, rename, reactivate) do **not** remove or rewrite allocation FKs. Conflict detection operates on refs already embedded on activities; archiving a resource does **not** filter it out of occupancy collection.

### Availability identity model

| State | Assignable catalog | Occupancy detection |
|-------|-------------------|---------------------|
| **ACTIVE + FREE** | Returned FREE | No conflict windows |
| **ACTIVE + OCCUPIED** | Returned OCCUPIED | Training/tournament/event FK + match code map + weekplanner plan integration |
| **INACTIVE / ARCHIVED** | **Excluded** from `getResourceAvailability` candidate query (aligned with `getActiveResourceOptionsForTenant` ACTIVE-only rule as of 08-08C) | Existing FK allocations still queried by id/code; historical refs on week items unchanged |
| **SAFE DELETE** | Resource absent from catalog | Cannot exist while referenced (08-08A RESTRICT + guard) |
| **BLOCKED DELETE** | Resource remains | Occupancy + conflicts unchanged |

### Lifecycle semantics (characterization)

| Operation | Conflict engine | Availability selectors | Historical refs on activities |
|-----------|-----------------|------------------------|------------------------------|
| Rename (same id) | Same conflict pairs; updated `facilityResourceName` | ACTIVE row shows new name | FK id stable |
| Archive / inactive while occupied | Conflicts **preserved** on existing overlaps | Not assignable for new booking | Refs + conflicts on next week read |
| Reactivate | Same id; conflicts unchanged | ACTIVE again in catalog | No duplicate lane |
| Safe delete | N/A (no allocations) | Absent | N/A |
| Blocked delete | Unchanged | Unchanged | Unchanged |

### Pitch & dressing-room results

- **Parity:** Same conflict primitive for `PITCH_HALL` and `DRESSING_ROOM`; tournament participant + match away dressing included in occupancy collection.
- **Capacity hierarchy:** FULL↔HALF within one `facilityId` still shares conflict capacity; rename does not alter hierarchy keys (id + type + facilityId).
- **Cancellation (08-07R5):** Removing cancelled training from item set clears pitch + dressing conflicts and releases availability occupancy for that session.

### Cross-domain matrix (automated)

| Pair | Pitch conflict | Dressing conflict |
|------|----------------|-------------------|
| TRAINING ↔ TRAINING | COVERED_BY_TEST | COVERED_BY_TEST |
| TRAINING ↔ MATCH | COVERED_BY_TEST | COVERED_BY_TEST (incl. away room) |
| TRAINING ↔ TOURNAMENT | COVERED_BY_TEST | COVERED_BY_TEST (participant room) |
| TRAINING ↔ VERANSTALTUNG | COVERED_BY_TEST | NOT_APPLICABLE (no dressing on sample event) |
| MATCH ↔ TOURNAMENT | COVERED_BY_TEST | NOT_APPLICABLE unless away/participant rooms overlap |
| TOURNAMENT ↔ VERANSTALTUNG | COVERED_BY_TEST | NOT_APPLICABLE |

### Conflict vs availability consistency

For FK-backed training occupancy on the same interval, weekplanner conflict annotation and `getResourceAvailability` both report **OCCUPIED** (08-08C test). Match legacy rename integrity is handled by **08-08C/R1** (alias + propagation — see below).

### Match legacy seam (F-08-08-03) — 08-08C/R1 compatibility layer

- **Model:** Match still persists SCE-local codes (`Event.pitchCode`, `homeDressingRoomCode`, `awayDressingRoomCode`), not `facilityResourceId` FKs. Physical identity for facility-backed logic is **`facilityResourceId`** resolved at read time.
- **Strategy (R1):** **A + B combined** — on `FacilityResource.code` rename, atomically (same transaction) register retired code in `FacilityResourceCodeAlias` (tenant-scoped, blocks code reuse) **and** propagate new code into Match allocation fields. Read paths merge current codes + aliases (`match-legacy-resource-compatibility.ts`, weekplanner + availability).
- **Provider authority:** SFV schedule/detail sync **never** writes `pitchCode` / dressing codes (PUB-01 / `sync-schedule-persistence` U8). Propagation is SCE-local and survives normal resync.
- **Delete guard:** Match-only legacy references count toward `RESOURCE_IN_USE` via `matchLegacyReferences` in `facility-resource-reference-guard.ts`.
- **Code reuse:** Retired codes remain in alias table → `assertFacilityResourceCodeAvailable` rejects assigning old code to a new physical resource; alias map resolves historical Match to original `facilityResourceId`.
- **Full Match FK migration:** **DEFERRED_NON_BLOCKING** — not required for FACILITY-INTEGRITY-01 Match rename/delete/conflict/availability closure.
- **Tests:** `lib/facilities/__tests__/match-legacy-resource-compatibility.test.ts` (+ updated 08-08C characterization).

### Defects fixed in 08-08C

| Fix | Detail |
|-----|--------|
| Availability assignable filter | `getResourceAvailability` now queries **ACTIVE** facility + resource only (was `not ARCHIVED`, which incorrectly included INACTIVE as selectable) |

## 3D. SCE-PLANNER-UX-08-08C/R1 — Match legacy resource rename compatibility

| Invariant | Mechanism |
|-----------|-----------|
| Rename KR2 → KUNSTRASEN2 | Transaction: alias old code + propagate Match fields + update resource |
| Stale code read | `FacilityResourceCodeAlias` merged into weekplanner + availability code maps |
| Code reuse | Alias unique `(tenantId, code)` + duplicate guard |
| Delete | `matchLegacyReferences` in reference guard |
| SFV resync | Provider never writes allocation codes — propagation not reverted |

```bash
npm run test -- lib/facilities/__tests__/match-legacy-resource-compatibility.test.ts
```

| Suite | Result |
|-------|--------|
| R1 characterization | **PASS** (10 tests) |
| Broad sweep | **1013 pass, 14 fail — PRE_EXISTING (F-08-08-06)**; **NEW_FAILURES = 0** |
| Build | **PASS** |

## 3E. SCE-PLANNER-UX-08-08D — cross-domain integration regression

### Canonical integration fixture

Single representative week (`2026-10-07`) with:

| Asset | Identity |
|-------|----------|
| **Facility** | Parent `fac-hauptfeld` + Garderobe facility |
| **Pitches** | `HAUPTFELD` (FULL), `HAUPTFELD A` (HALF), `KR2` (second full pitch) |
| **Dressing** | `D1`, `D2` |
| **Training** | Series + occurrence on Hauptfeld + D1; cancelled session on KR2 (08-07R5 removal) |
| **Match** | Legacy codes on Hauptfeld + home/away dressing |
| **Tournament** | Pitch on Hauptfeld; **per-participant** D1/D2 (not flattened) |
| **Veranstaltung** | FK allocation on KR2 (non-overlap window for pitch isolation tests) |

Pipeline under test: `WeekplannerItem[]` → `buildWeekplannerWeek` → conflict annotation → perspective filters (`filterWeekplannerItem`, `listOperationalItemVisible`, `planner-view-consistency.ts`).

### Cross-domain read model

| Domain | Automated evidence |
|--------|-------------------|
| TRAINING | Canonical key `TRAINING:{trainingSessionId}`; cancellation removes occurrence |
| MATCH | `MATCH:{eventId}`; `eventSource` + `teamSeasonId` preserved |
| TOURNAMENT | `TOURNAMENT:{eventId}`; `teamSeasonIds`; participant dressing refs |
| VERANSTALTUNG | `VERANSTALTUNG:{eventId}`; `allDay` semantics unchanged |
| Identity collisions | **None** — four distinct canonical keys in one week |

### Planner view consistency (Kalender · Spielfeld · Garderobe · Liste)

Shared week payload; perspectives differ only by filter geometry:

| View | Rule characterized |
|------|-------------------|
| **Kalender** | All non-cancelled activities in day bucket |
| **Liste** | Same ids as Kalender with default `alle` + empty search |
| **Spielfeld** | Activity visible iff `pitchAllocations` contains lane `facilityResourceId` |
| **Garderobe** | Activity visible iff home/away/participant dressing refs contain lane id |

**Silent disappearance:** none detected for the canonical fixture across perspectives.

### Cross-domain conflict & availability matrices

Extended 08-08C matrix with **TRAINING↔EVENT**, **MATCH↔EVENT**, **TOURNAMENT↔EVENT**, non-overlap, distinct-pitch, cancelled-training, rename-stable `facilityResourceId`, dressing cross-domain (incl. match away + tournament participant).

Availability: training, match (alias), tournament FK, event FK — all **OCCUPIED** on shared interval; conflict engine + availability **consistent** for characterized pitch occupancy.

### Match R1 inside full planner flow

Rename/alias/reallocation characterized in `sce-planner-ux-08-08d-cross-domain-integration.test.ts` (complements `match-legacy-resource-compatibility.test.ts`):

- Stale `pitchCode` → same `facilityResourceId` via alias map  
- Code reuse blocked when alias exists  
- Reallocation changes physical id; rename does not  

### Delete-guard completeness (post R1)

`facility-resource-reference-guard.ts` counts:

`TrainingAllocation`, `TrainingSessionAllocation`, `TournamentResourceAllocation`, `TournamentParticipantAllocation`, `WeekplannerPlanAllocation`, `EventFacilityAllocation`, **plus** `matchLegacyReferences`.

Schema audit: no additional `FacilityResource` operational FK beyond the above (+ `FacilityResourceCodeAlias` cascade-only).

### F-08-08-04 reassessment (duplicate resource)

| Class | Verdict |
|-------|---------|
| **A** Same display name, different legitimate resource | Still possible (e.g. Hauptfeld vs Hauptplatz) — **not** unsafe duplicate identity |
| **B** Two active rows, same physical pitch/dressing | **No reproducible unsafe create/update path** after tenant-scoped normalized code uniqueness + facility `(type, normalized name)` guard |
| **Status** | **PARTIAL → ACCEPTED_RESIDUAL** — legacy Class B pairs remain historical; no fuzzy merge |

### F-08-08-05 (aggregation)

| Check | Result |
|-------|--------|
| Mixed cluster headline | `{n} Aktivitäten` — **no regression** (08-08D assertion) |
| Inspector per-type breakdown | Still absent |
| Classification | **OPTIONAL_POLISH** — not release-blocking |

### F-08-08-06 (test harness)

Broad sweep (same command as §11): **1045 pass, 14 fail** — identical failure set to pre-08-08D baseline.

| Failure bucket | Tests | Classification |
|----------------|-------|----------------|
| `plan-overrides.test.ts` | 3 | **MOCK_DRIFT** (tournament plan override mocks) |
| `PlanningHubResourcePitchGroups*.tsx` | 7 | **HARNESS_STALE** (component props / facility catalog fixtures) |
| `PlanningHubResourceScopeControl.test.tsx` | 4 | **HARNESS_STALE** (`search` undefined → `planner-url` `.trim`) |

**REAL_PRODUCT_DEFECTS:** **0**  
**NEW_FAILURES (broad sweep):** **0**  
**Next slice:** 08-08F test hygiene (do not block 08-08D).

### Infoboard bounded review

| Check | Result |
|-------|--------|
| FACILITY-INTEGRITY-01A | **CLOSED** — not reopened |
| Screen-2 Hauptfeld resolver | **COVERED_BY_TEST** — `screen2-preview-facility-resolver.test.ts` (unchanged) |
| Dynamic DB reads / cache | No facility-lifecycle cache invalidation required for Infoboard (same as 08-08B) |
| Note | `canonical-source-loader.test.ts` **11b** fails in isolation (loader returns no event — **MOCK_DRIFT**, outside the 14-test broad baseline) |

### Tests (08-08D)

```bash
npm run test -- lib/planning-hub/__tests__/sce-planner-ux-08-08d-cross-domain-integration.test.ts
```

| Suite | Result |
|-------|--------|
| 08-08D cross-domain integration | **PASS** (32 tests) |
| 08-08A + B + C + R1 (regression) | **PASS** |
| 08-01…08-07 planning-hub packs | **PASS** (109 tests) |
| Facilities `__tests__` | **PASS** (168 tests) |
| Planning-hub `__tests__` (incl. 08-08D) | **PASS** (379 tests) |
| Broad sweep (§11 command) | **14 fail — F-08-08-06**; **NEW_FAILURES = 0** |
| Build | **PASS** |

---

## 3F. SCE-PLANNER-UX-08-08F — test harness closure & automated release baseline

**HEAD (08-08F):** post-harness commit on branch `cursor/sce-planner-ux-08-08-integration-integrity-final-uat-a6e2`  
**Production code changed:** **NONE** (test-only repairs)

### F-08-08-06 — 14 failure root-cause table (pre-fix)

| # | Test file | Test name (summary) | Error | Classification | Root cause | Expected current contract |
|---|-----------|---------------------|-------|----------------|------------|---------------------------|
| 1–3 | `lib/weekplanner/__tests__/plan-overrides.test.ts` | Tournament override + read-only guard | `teamSeason.findMany` undefined | **MOCK_DRIFT** | Prisma mock missing `teamSeason` after tournament `teamSeasonId` resolution in `queries.ts` | Mock returns `{ id, teamId }` rows for tournament participants |
| 4–6 | `PlanningHubResourcePitchGroups.test.tsx` | R2 pitch group collapse/expand | `search.trim` on undefined | **HARNESS_STALE** | `PlanningHubUrlState.search` required (`string`, default `""` via `parsePlanningHubUrlState`) | Test `urlState` includes `search: ""` |
| 7–10 | `PlanningHubResourcePitchGroupsR3.test.tsx` | R3 collapsed activity / DnD ids | same | **HARNESS_STALE** | same | same |
| 11–14 | `PlanningHubResourceScopeControl.test.tsx` | R1 scope chips / popover | same | **HARNESS_STALE** | same | same |

**REAL_PRODUCT_DEFECTS:** **0**  
**CLASSIFICATION_CHANGES:** **0** (08-08D buckets confirmed)

### Additional isolation fix (outside the 14)

| Test | Classification | Repair |
|------|----------------|--------|
| `canonical-source-loader.test.ts` **11b** | **MOCK_DRIFT** / stale assertion | Loader intentionally filters `VERANSTALTUNG` items before mapping (`createCanonicalInfoboardSourceLoader`); test now expects **empty feed**, not `OTHER` mapping |

### Harness repairs applied

| Area | Change |
|------|--------|
| **PLANNER_URL / search** | Added `search: ""` to stale `urlState` fixtures in resource UI tests (matches `PlanningHubUrlState` and production SSR defaults) |
| **PLANNING_HUB_RESOURCE_UI** | Same — no deprecated props restored |
| **PLAN_OVERRIDES** | Added `prisma.teamSeason.findMany` mock + default `{ id: teamseason-own, teamId: team-own }` in `beforeEach` |
| **INFOBOARD_CANONICAL_SOURCE** | Test **11b** aligned to omit-VERANSTALTUNG feed contract |

### Regression results (08-08F)

```bash
# Broad sweep (§11) — primary F-08-08-06 gate
npm run test -- lib/weekplanner lib/planning-hub lib/facilities/__tests__ \
  lib/planning/__tests__/planning-ux-07r* components/admin/planning-hub/__tests__
# → 131 files, 1059 tests — ALL PASS

# Extended 08-08 + integrity packs (08-01…08-08D, infoboard resolver, training list)
npm run test -- lib/planning-hub/__tests__/sce-planner-ux-08 \
  lib/planning-hub/__tests__/aggregate \
  lib/planning-hub/scheduler/__tests__/aggregate-cluster.test.ts \
  lib/facilities/__tests__/facility-integrity \
  lib/weekplanner/__tests__/conflict-detection.test.ts \
  lib/weekplanner/__tests__/availability-integration.test.ts \
  lib/training/__tests__/weekplanner-session-list.test.ts \
  lib/publishing/infoboard/__tests__/canonical-source-loader.test.ts \
  lib/publishing/infoboard/__tests__/screen2-preview-facility-resolver.test.ts
# → 25 files, 226 tests — ALL PASS

NODE_OPTIONS=--max-old-space-size=8192 npm run build
# → PASS
```

| Run | Result |
|-----|--------|
| Broad sweep (§11) | **131 files, 1059 tests — ALL PASS** (was 1045 pass / 14 fail) |
| Extended 08-08 packs | **226 tests — ALL PASS** |
| Full repository `npm run test` | **1477 files pass / 160 fail files** — failures are **live-DB / integration / env** suites (`TEST_DATABASE_URL`, S3, etc.); **not** 08-08 release surface |
| Build | **PASS** |
| Lint (`npm run lint`) | **54 errors / 762 warnings** — pre-existing repo baseline; not introduced by 08-08F |
| Typecheck | **Via `next build`** (no separate `typecheck` script) — **PASS** |

### F-08-08-06 closure

| Finding | Status |
|---------|--------|
| F-08-08-06 | **FIXED / TEST HARNESS GREEN** |

### Executable Human UAT pack (FCA — do not run in 08-08F)

**DATA_SAFETY:** Prefer reversible rename/archive; use clearly marked temporary resources for create/delete; never delete real historical resources to prove guards; blocked-delete only when UI confirms guard before destructive action.

#### A. EXECUTABLE_NOW

| CASE_ID | PRECONDITION | PERSONA | PAGE | ACTION | EXPECTED_RESULT | PASS_CRITERIA | RESTORE/CLEANUP | IMPERSONATION |
|---------|--------------|---------|------|--------|-----------------|---------------|-----------------|---------------|
| UAT-FI-01 | Known pitch + open Wochenplaner week | Club admin | Admin → Facilities → Planner (Kalender) | Rename pitch label; navigate Planner (or soft refresh) | Labels on Kalender/Spielfeld match new name | Visible text updated without hard reload | Revert rename | No |
| UAT-FI-02 | HOME Match + Training same week on that pitch | Club admin | Planner Spielfeld + Matchcenter | Rename pitch | Match + Training stay on same physical lane; conflict badge unchanged if overlap unchanged | Same resource identity / conflict state | Revert rename | No |
| UAT-FI-03 | Training with Garderobe | Club admin | Planner Garderobe | Rename dressing resource | Lane headers / chips show new name | Correct dressing labels | Revert rename | No |
| UAT-FI-04 | Active resource | Club admin | Admin Facilities | Archive/deactivate resource | Absent from new assignment selectors; existing week activities still readable | Assign blocked; historical visible | Reactivate | No |
| UAT-FI-05 | Archived resource | Club admin | Admin Facilities | Reactivate | Reappears in assignment selectors | Selectable again | Archive again if desired | No |
| UAT-FI-06 | Resource with allocations | Club admin | Admin Facilities | Attempt permanent delete | German actionable error; no silent link strip | 409 / blocked UI | None (no delete) | No |
| UAT-FI-07 | Unused temp resource | Club admin | Admin + Planner | Create temp → delete when unused | Gone from admin + planner catalog after refresh | No orphan lanes | N/A | No |
| UAT-FI-08 | Two browser tabs on Planner | Club admin | Planner (2 tabs) | Facility mutation tab A; view tab B | Tab B shows fresh labels after navigation/refresh path product defines | Cross-tab freshness acceptable | Revert mutation | No |

#### B. BLOCKED_BY_IMPERSONATION

| CASE_ID | PRECONDITION | PERSONA | PAGE | ACTION | EXPECTED_RESULT | PASS_CRITERIA | RESTORE/CLEANUP | IMPERSONATION |
|---------|--------------|---------|------|--------|-----------------|---------------|-----------------|---------------|
| UAT-PERM-01 | Sandra / allocation-only user | Training staff | Garderobe | DnD without allocation manage | Blocked or read-only per role | Matches 08-04 policy | — | **Required** (PEOPLE-ACCESS-IMPERSONATION-01) |
| UAT-PERM-02 | Read-only coach | Kalender | Drag activity | Denied | No mutation | — | **Required** |
| UAT-PERM-03 | Training-only manager | Conflict workspace | Apply resolution | Denied without rights | 403 / disabled | — | **Required** |
| UAT-PERM-04 | Role changed mid-session | Planner | Retry privileged action | Stale permission handled | Safe failure | — | **Required** |
| UAT-PERM-05 | Facilities admin vs planner view-only | Admin + Planner | Facility PATCH vs view | Separation holds | No privilege bleed | — | **Required** |

**HUMAN_UAT_PACK:** **READY** (executable subset does not wait on impersonation)

### FACILITY-INTEGRITY-01 — final automated matrix (summary)

| Area | Status |
|------|--------|
| Pitch lifecycle (admin + planner + conflict + availability) | **COVERED_BY_TEST** (08-08A–D) |
| Dressing lifecycle | **COVERED_BY_TEST** |
| Match legacy rename/delete/conflict/availability | **COVERED_BY_TEST** (R1 + 08-08D) |
| Tournament + Event cross-domain | **COVERED_BY_TEST** (08-08D) |
| Training cancel + reconciliation | **COVERED_BY_TEST** (08-07R5 + 08-08D) |
| Cache/revalidation | **COVERED_BY_TEST** (08-08B) |
| Infoboard | **COVERED_BY_TEST** (01A + resolver); live refresh **UNPROVEN** (Human UAT) |
| Open planner cross-tab refresh | **UNPROVEN** — Human UAT step |
| **OVERALL** | **AUTOMATED_GATE_PASS / HUMAN_UAT_PENDING** |

### Final Human UAT checklist

Superseded by executable pack **§3F** (`EXECUTABLE_NOW` vs `BLOCKED_BY_IMPERSONATION`). Do not execute during 08-08F agent run.

### FACILITY-INTEGRITY-01 — Match cells (post R1)

| Cell | Status |
|------|--------|
| MATCH_PITCH_RENAME | **COVERED_BY_TEST** |
| MATCH_PITCH_STATUS | **COVERED_BY_TEST** (alias + inactive catalog rules unchanged) |
| MATCH_PITCH_DELETE | **COVERED_BY_TEST** |
| MATCH_DRESSING_RENAME | **COVERED_BY_TEST** |
| MATCH_DRESSING_STATUS | **COVERED_BY_TEST** |
| MATCH_DRESSING_DELETE | **COVERED_BY_TEST** |
| MATCH_CONFLICT | **COVERED_BY_TEST** |
| MATCH_AVAILABILITY | **COVERED_BY_TEST** |
| MATCH_HISTORICAL_IDENTITY | **COVERED_BY_TEST** (alias) |
| OVERALL_STATUS | **OPEN** — FI-01 not fully closed (non-Match cells / Human UAT) |

### Tests (08-08C)

```bash
npm run test -- lib/planning-hub/__tests__/sce-planner-ux-08-08c-conflict-availability-integrity.test.ts \
  lib/weekplanner/__tests__/conflict-detection.test.ts \
  lib/facilities/__tests__/availability-service.test.ts \
  lib/weekplanner/__tests__/availability-integration.test.ts
```

| Suite | Result |
|-------|--------|
| 08-08C new characterization | **PASS** (20 tests) |
| 08-08A + 08-08B (unchanged) | **PASS** |
| Focused conflict + availability | **PASS** (111 tests in combined 08-08C run) |
| Broad sweep | **1002 pass, 14 fail — PRE_EXISTING (F-08-08-06)**; **NEW_FAILURES = 0** |
| Build | **PASS** |

---

## 4. Facility mutation → consumer matrix

Legend: **PASS** = code + test evidence; **COVERED_BY_TEST** = automated characterization; **UNPROVEN** = plausible but no E2E proof in this task; **BROKEN** = known defect; **N/A**

| Mutation ↓ / Consumer → | Admin | Training | Match | Tournament | Club event | Kalender | Spielfeld | Garderobe | Liste | Conflict engine | Availability | Infoboard | Historical refs | Future refs | Cache/reval |
|---------------------------|-------|----------|-------|------------|------------|----------|-----------|-----------|-------|-----------------|--------------|-----------|-----------------|-------------|-------------|
| Pitch create | PASS | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | **COVERED_BY_TEST** | COVERED_BY_TEST | COVERED_BY_TEST | N/A | COVERED_BY_TEST | PASS next read | PASS next read | UNPROVEN | N/A | PASS | **COVERED_BY_TEST** |
| Pitch rename | PASS | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | **COVERED_BY_TEST** | COVERED_BY_TEST | COVERED_BY_TEST | COVERED_BY_TEST | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | COVERED_BY_TEST | PASS (id) | PASS | **COVERED_BY_TEST** |
| Pitch archive | PASS | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | **COVERED_BY_TEST** | COVERED_BY_TEST | COVERED_BY_TEST | COVERED_BY_TEST | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | UNPROVEN | PASS withRequiredCodes | PASS block new | **COVERED_BY_TEST** |
| Pitch delete | PASS+guard | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | **COVERED_BY_TEST** | COVERED_BY_TEST | COVERED_BY_TEST | COVERED_BY_TEST | COVERED_BY_TEST | **COVERED_BY_TEST** (blocked) | **COVERED_BY_TEST** | UNPROVEN | **PASS** (links kept) | PASS | **COVERED_BY_TEST** |
| DR create | PASS | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | NOT_APPLICABLE | COVERED_BY_TEST | N/A | COVERED_BY_TEST | COVERED_BY_TEST | PASS next read | PASS next read | UNPROVEN | N/A | PASS | **COVERED_BY_TEST** |
| DR rename | PASS | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | NOT_APPLICABLE | COVERED_BY_TEST | N/A | COVERED_BY_TEST | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | UNPROVEN | PASS (id) | PASS | **COVERED_BY_TEST** |
| DR archive | PASS | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | NOT_APPLICABLE | COVERED_BY_TEST | N/A | COVERED_BY_TEST | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | UNPROVEN | PASS | PASS block new | **COVERED_BY_TEST** |
| DR delete | PASS+guard | COVERED_BY_TEST | **COVERED_BY_TEST** | **COVERED_BY_TEST** | NOT_APPLICABLE | COVERED_BY_TEST | N/A | COVERED_BY_TEST | COVERED_BY_TEST | **COVERED_BY_TEST** (blocked) | **COVERED_BY_TEST** | UNPROVEN | **PASS** | PASS | **COVERED_BY_TEST** |

Evidence anchors: `facility-mutation-08-08b.test.ts`, `facility-mutation-revalidation.test.ts`, `WeekPlannerWorkspace.facility-groups-sync.test.tsx`, `facility-delete-service.test.ts`, `facility-lifecycle-08-08a.test.ts`, **`sce-planner-ux-08-08c-conflict-availability-integrity.test.ts`**, **`match-legacy-resource-compatibility.test.ts`**, **`sce-planner-ux-08-08d-cross-domain-integration.test.ts`**, **`planner-view-consistency.ts`**. Match rename/delete/conflict/availability cells **COVERED_BY_TEST** (R1 + 08-08D); full Match FK model still **DEFERRED**.

---

## 5. Cross-domain activity integrity (diagnosis)

| Domain | Automated evidence | Gaps / Human UAT |
|--------|---------------------|------------------|
| **Training** lifecycle, recurrence, cancel, reconcile | 08-03, 08-07R4/R5, `weekplanner-session-list.test.ts` | Full recurrence + facility change under open planner |
| **Match** SFV authority, teamSeason, pitch presentation | 08-03/04/06 tests, `match-team-season-resolution.test.ts` | Provider reschedule boundaries — Human UAT |
| **Tournament** teamSeasonIds, allocations | 08-08D + `plan-overrides.test.ts` (**PASS** post-08-08F) | Participant dressing under facility rename |
| **Club event** allocations, all-day | `sce-events-01*` tests | Facility lifecycle + all-day cluster |

---

## 6. Conflict engine integrity

- Single server interpretation: `annotateWeekplannerConflicts` only
- Excludes self via `weekplannerCanonicalActivityKey`
- Pitch FULL/HALF hierarchy in `pitch-capacity-overlap.ts`
- Cancelled trainings excluded from item set → conflicts recalc automatically
- **Archived/inactive resources:** conflicts use refs on items; catalog status does not suppress pairwise detection (08-08C)
- **Safe delete:** blocked when referenced (08-08A); conflicts cannot be silently removed by delete while allocations exist
- No client-side second conflict engine in hub (manipulation uses server validate)

---

## 7. Availability integrity

- Uses same resource IDs for training/tournament/event FK paths
- Match uses code → resource map
- New resources: appear after DB commit + next read
- Assignable catalog: ACTIVE-only (`getActiveResourceOptionsForTenant`, `getResourceAvailability` as of 08-08C)
- Deactivated/archived: blocked for new assignment; inactive no longer returned as availability rows
- Cancelled sessions: excluded from weekplanner occupancy set (08-07R5)

---

## 8. AGGREGATION-01 status

| Verdict | Detail |
|---------|--------|
| **Primary UAT defect** | **RESOLVED_BY_08_07** — `summarizeAggregateCluster` uses `{n} Aktivitäten` for mixed clusters (08-07R2); tests in `aggregate-cluster.test.ts`, `PlanningHubCalendarClippedDetail.test.tsx` |
| **Full AGGREGATION-01 spec** | **STILL_REQUIRED (P3)** — no shared `countByActivityType` model; aggregate inspector shows Trainings count but not explicit «● 9 Trainings · ● 1 Spiel» line from spec doc |
| **Follow-up** | Optional 08-08E slice — extend `computeAggregateInspectionMetrics` + cluster summary only if product insists on inspector parity |

---

## 9. Permissions / impersonation UAT limitations

**PEOPLE-ACCESS-IMPERSONATION-01:** OPEN — not solved in 08-08.

**Automated coverage:** 08-04 permission-aware manipulation tests, tenant isolation, stale 403 handling.

**MANUAL_UAT_BLOCKED_BY_IMPERSONATION** (cannot reliably prove on STAGE without «Als Benutzer ansehen»):

1. Sandra / allocation-only persona — Garderobe DnD without `PLANNING_ALLOCATIONS_MANAGE`
2. Read-only coach — negative paths on Kalender DnD and conflict apply
3. Training-only manager — conflict workspace apply without allocation manage (post-08-07R5 revalidate permission partially mitigated)
4. Cross-persona stale-permission refresh after role change mid-session
5. Facility admin (`FACILITIES_MANAGE`) vs planner view-only separation under non-admin impersonation

---

## 10. Deletion safety audit

| Entity | FK behavior | Classification |
|--------|-------------|----------------|
| **FacilityResource** | Allocation FKs `onDelete: Restrict` (08-08A) | **SAFE** — DB refuses delete while referenced |
| **Facility** | Cascades to child resources; child delete hits Restrict when referenced | **SAFE** — blocked when any child in use |
| **Application guard** | Transaction + reference counts + 409 error contract | **SAFE** — matches DB (race-safe) |
| **Recommendation** | Archive/deactivate for retired resources; physical delete only when impact `deletable: true` |

---

## 11. Test coverage map

| Area | Level | Representative suites |
|------|-------|------------------------|
| Activity mapping / weekplanner read model | **GOOD** | `lib/weekplanner/__tests__/*`, `queries.test.ts` |
| Resource identity / manipulation | **GOOD** | `sce-planner-ux-08-02*`, `scheduler-manipulation` |
| Facility hierarchy / 01A | **GOOD** | `fca-main-pitch-*`, `facility-integrity-diagnosis` |
| Conflict calculation | **GOOD** | `conflict-detection.test.ts`, 08-05 suites |
| Availability | **PARTIAL** | `availability-integration.test.ts` — limited cross-event + facility lifecycle |
| DnD / schedule / pitch / dressing | **GOOD** | 08-03, 08-04, 08-02 |
| Cancellation / reconciliation | **GOOD** | 08-07R4/R5 |
| Aggregation | **PARTIAL** | cluster + inspector metrics — no full type breakdown |
| Responsive UX | **GOOD** | 08-07 |
| Permissions | **GOOD** (automated) | 08-04 — manual impersonation gap |
| **Facility lifecycle → planner E2E** | **PARTIAL** | Revalidation + client catalog sync tested; no browser E2E in 08-08B |
| **Facility mutation revalidation** | **GOOD** | `facility-mutation-08-08b.test.ts`, route tests |

### Regression commands (this diagnosis)

```bash
# Focused 08-xx + integrity (PASS)
npm run test -- lib/planning-hub/__tests__/sce-planner-ux-08 \
  lib/planning-hub/__tests__/aggregate \
  lib/planning-hub/scheduler/__tests__/aggregate-cluster.test.ts \
  lib/facilities/__tests__/facility-integrity \
  lib/facilities/__tests__/queries.test.ts \
  lib/weekplanner/__tests__/conflict-detection.test.ts \
  lib/weekplanner/__tests__/availability-integration.test.ts \
  lib/training/__tests__/weekplanner-session-list.test.ts

# Broader planner sweep (08-08F — green)
npm run test -- lib/weekplanner lib/planning-hub lib/facilities/__tests__ \
  lib/planning/__tests__/planning-ux-07r* components/admin/planning-hub/__tests__

NODE_OPTIONS=--max-old-space-size=8192 npm run build
```

| Run | Result |
|-----|--------|
| Focused 08 + integrity | **23 files, 184 tests — PASS** |
| Broad sweep | **131 files, 1059 tests — ALL PASS** (08-08F) |
| Build | **PASS** |

---

## 12. Prioritized findings

| ID | Sev | Domain | Current | Expected | Root cause | Consumers | Tests | Fix slice |
|----|-----|--------|---------|----------|------------|-----------|-------|-----------|
| F-08-08-01 | P1 → **FIXED (08-08A+08-08B)** | Facility delete | Delete blocked / RESTRICT; revalidation on safe delete | Historical activities remain intelligible | Restrict + service guards + post-delete revalidation | Planner, trainings, tournaments, events | `facility-delete-service.test.ts`, `facility-mutation-08-08b.test.ts` | **Done** |
| F-08-08-02 | P2 → **FIXED (08-08B)** | Facility mutate → cache | Planner paths revalidated; client catalog syncs to server props | Planner surfaces update after facility mutation + RSC refresh | Was missing `revalidatePlannerWeekPaths` on `/api/facilities/*` | Kalender, Spielfeld, Garderobe, Liste, manipulation selectors | `facility-mutation-08-08b.test.ts` | **08-08B done** |
| F-08-08-03 | P2 → **FIXED_COMPATIBILITY_LAYER (08-08C/R1)** | Match identity | Match pitch/dressing via legacy codes + alias/propagation | Stable physical identity across rename | Was code-only lookup without rename seam | Match planner, availability, conflict, delete guard | **COVERED_BY_TEST** (`match-legacy-resource-compatibility.test.ts`) | Full Match FK migration **deferred non-blocking** |
| F-08-08-04 | P2 → **ACCEPTED_RESIDUAL (08-08D review)** | Legacy codes | STADION_* + Hauptfeld/Hauptplatz pair persists | No unsafe duplicate physical identity path | Admin duplicate code/name guard; distinct names legit | Duplicate lanes for distinct names only | `facility-lifecycle-08-08a.test.ts`, **08-08D** | No fuzzy merge; Human UAT optional visual check |
| F-08-08-05 | P3 | Aggregation | Inspector lacks per-type breakdown line | AGGREGATION-01 full spec | Only `trainingCount` in metrics | Aggregate inspector | PARTIAL | 08-08E optional |
| F-08-08-06 | P3 → **FIXED (08-08F)** | Test harness | Broad sweep green | Green CI | Stale `urlState.search`; missing `teamSeason` mock; stale Infoboard 11b | CI signal | Broad sweep **PASS** | **Done** |
| F-08-08-07 | DEFERRED | Impersonation | Manual persona UAT blocked | Reliable impersonation | PEOPLE-ACCESS-IMPERSONATION-01 open | Permission UAT | N/A | Separate package |

**P0:** none identified in this diagnosis pass.

---

## 13. Proposed implementation slices (ordered)

| Slice | Problem | Domains | Invariants | Tests | Human UAT | Depends |
|-------|---------|---------|------------|-------|-----------|---------|
| **08-08A** | Facility lifecycle canonicalization + admin guards | Admin, duplicate prevention | Archive-first; delete only when unused | **DONE** — see §3A | — | — |
| **08-08B** | Mutation → revalidation + client facility-groups refresh | All planner perspectives | After facility PATCH/DELETE, planner paths revalidated; open hub refreshes labels | **DONE** — `facility-mutation-08-08b.test.ts` | Cross-tab refresh still manual | 08-08A |
| **08-08C** | Conflict/availability after resource lifecycle | Conflicts, availability, historical display | No silent loss of conflict truth on archive/rename | **DONE** — `sce-planner-ux-08-08c-conflict-availability-integrity.test.ts` | Delete blocked with allocations | 08-08A |
| **08-08D** | Cross-domain integration regression pack | Training/match/tournament/event + facility | Single week read model | **DONE** — `sce-planner-ux-08-08d-cross-domain-integration.test.ts` | Full week scenario (Human UAT checklist §3E) | 08-08B |
| **08-08E** | Aggregation closure (optional) | Kalender + inspector | Shared `countByActivityType` | `aggregate-inspection` | Mixed cluster copy | — |
| **08-08F** | Final automated regression + Human UAT pack | All | 08-01…08-07 + FI-01 gates | **DONE** — broad sweep green + build | §3F checklist (Human run) | 08-08A–D |

**FINAL_UAT_GATE:** FACILITY-INTEGRITY-01 lifecycle matrix predominantly PASS/COVERED; no P1 open; 08-07 CLOSED; build green; documented impersonation gaps accepted or PEOPLE-ACCESS-IMPERSONATION-01 resolved.

---

## 14. Release gates (08-08 closure criteria)

| Gate | Status |
|------|--------|
| 08-07 unified planner packages on STAGE | PASS (contained) |
| FACILITY-INTEGRITY-01A | CLOSED |
| FACILITY-INTEGRITY-01 broader lifecycle | **AUTOMATED_GATE_PASS / HUMAN_UAT_PENDING** — matrix §3E |
| AGGREGATION-01 | **Partial** — headline fixed; full spec optional |
| PEOPLE-ACCESS-IMPERSONATION-01 | OPEN |
| PROD untouched | PASS |
| 08-08 automated release baseline (F-08-08-06) | **PASS** |
| Human UAT pack prepared | **PASS** — §3F |

**08-08 is NOT CLOSED** (Human UAT + optional aggregation/impersonation remain).
