# SCE-PLANNER-UX-08-08 — Integration, Integrity & Final UAT Hardening

**Status:** **IN PROGRESS** — Phase 1 diagnosis complete; **08-08A implemented** (lifecycle/delete safety); 08-08B/C pending  
**08_08A_STATUS:** **IMPLEMENTED / AUTOMATED TEST PASS**  
**Branch:** `cursor/sce-planner-ux-08-08-integration-integrity-final-uat-a6e2`  
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
| `POST /api/planning-hub/planner-revalidate` | Same paths; permissions include `TRAININGS_MANAGE` (08-07R5) |
| Client | `PlanningHubManipulationContext` → fetch revalidate + `router.refresh()`; cancellation → `applyTrainingCancellationToPlannerWeek` |
| **Gap** | Facility admin PATCH/POST/DELETE routes **do not** call `revalidatePlannerWeekPaths()`; client `fetchPlanningHubFacilityGroupsClient()` memoizes in-flight fetch only for one load |

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

### Remaining gaps (not 08-08A)

- **08-08B:** facility mutation → planner revalidation / open-hub stale labels (F-08-08-02)
- **08-08C:** conflict/availability characterization after archive (adjacent to delete fix)
- **FACILITY-INTEGRITY-01:** not CLOSED until matrix + 08-08B/C complete

---

## 4. Facility mutation → consumer matrix

Legend: **PASS** = code + test evidence; **COVERED_BY_TEST** = automated characterization; **UNPROVEN** = plausible but no E2E proof in this task; **BROKEN** = known defect; **N/A**

| Mutation ↓ / Consumer → | Admin | Training | Match | Tournament | Club event | Kalender | Spielfeld | Garderobe | Liste | Conflict engine | Availability | Infoboard | Historical refs | Future refs | Cache/reval |
|---------------------------|-------|----------|-------|------------|------------|----------|-----------|-----------|-------|-----------------|--------------|-----------|-----------------|-------------|-------------|
| Pitch create | PASS | COVERED_BY_TEST | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | N/A | UNPROVEN | PASS next read | PASS next read | UNPROVEN | N/A | PASS | UNPROVEN |
| Pitch rename | PASS | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | P2 stale | P2 stale | P2 stale | P2 stale | PASS next read | PASS next read | COVERED_BY_TEST | PASS (id) | PASS | **BROKEN** no revalidate |
| Pitch archive | PASS | COVERED_BY_TEST | UNPROVEN | UNPROVEN | UNPROVEN | PASS next read | PASS next read | PASS next read | PASS next read | PASS next read | PASS selectors | UNPROVEN | PASS withRequiredCodes | PASS block new | UNPROVEN |
| Pitch delete | PASS+guard | COVERED_BY_TEST | UNPROVEN | UNPROVEN | UNPROVEN | PASS blocked | PASS blocked | PASS blocked | PASS blocked | PASS blocked | PASS blocked | UNPROVEN | **PASS** (links kept) | PASS | UNPROVEN |
| DR create | PASS | COVERED_BY_TEST | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | N/A | UNPROVEN | UNPROVEN | PASS next read | PASS next read | UNPROVEN | N/A | PASS | UNPROVEN |
| DR rename | PASS | UNPROVEN | UNPROVEN | UNPROVEN | UNPROVEN | P2 stale | N/A | P2 stale | P2 stale | PASS next read | PASS next read | UNPROVEN | PASS (id) | PASS | **BROKEN** no revalidate |
| DR archive | PASS | COVERED_BY_TEST | UNPROVEN | UNPROVEN | UNPROVEN | PASS next read | N/A | PASS next read | PASS next read | PASS next read | PASS selectors | UNPROVEN | PASS | PASS block new | UNPROVEN |
| DR delete | PASS+guard | COVERED_BY_TEST | UNPROVEN | UNPROVEN | UNPROVEN | PASS blocked | N/A | PASS blocked | PASS blocked | PASS blocked | PASS blocked | UNPROVEN | **PASS** | PASS | UNPROVEN |

Evidence anchors: `facility-delete-service.test.ts`, `facility-lifecycle-08-08a.test.ts`, `queries.test.ts`, `facility-integrity-diagnosis.test.ts`; revalidation gap unchanged in `app/api/facilities/**` (08-08B).

---

## 5. Cross-domain activity integrity (diagnosis)

| Domain | Automated evidence | Gaps / Human UAT |
|--------|---------------------|------------------|
| **Training** lifecycle, recurrence, cancel, reconcile | 08-03, 08-07R4/R5, `weekplanner-session-list.test.ts` | Full recurrence + facility change under open planner |
| **Match** SFV authority, teamSeason, pitch presentation | 08-03/04/06 tests, `match-team-season-resolution.test.ts` | Provider reschedule boundaries — Human UAT |
| **Tournament** teamSeasonIds, allocations | weekplanner plan-override tests (3 failures in full suite — env/mock) | Participant dressing under facility rename |
| **Club event** allocations, all-day | `sce-events-01*` tests | Facility lifecycle + all-day cluster |

---

## 6. Conflict engine integrity

- Single server interpretation: `annotateWeekplannerConflicts` only
- Excludes self via `weekplannerCanonicalActivityKey`
- Pitch FULL/HALF hierarchy in `pitch-capacity-overlap.ts`
- Cancelled trainings excluded from item set → conflicts recalc automatically
- **Archived/deleted resources:** conflicts use whatever refs remain on items; deleted resource removes FK links → empty allocation → conflict may disappear while activity remains (P1 for delete)
- No client-side second conflict engine in hub (manipulation uses server validate)

---

## 7. Availability integrity

- Uses same resource IDs for training/tournament/event FK paths
- Match uses code → resource map
- New resources: appear after DB commit + next read
- Deactivated/archived: blocked for new assignment (`getActiveFacilityResourcesByCodesForTenant`)
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
| **Facility lifecycle → planner E2E** | **MISSING** | No automated rename/delete propagation to open planner |
| **Facility mutation revalidation** | **MISSING** | — |

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

# Broader planner sweep (partial failures — see findings F-08-08-06)
npm run test -- lib/weekplanner lib/planning-hub lib/facilities/__tests__ \
  lib/planning/__tests__/planning-ux-07r* components/admin/planning-hub/__tests__

NODE_OPTIONS=--max-old-space-size=8192 npm run build
```

| Run | Result |
|-----|--------|
| Focused 08 + integrity | **23 files, 184 tests — PASS** |
| Broad sweep | **124 files, 966 tests — 952 pass, 14 fail** (see findings) |
| Build | **PASS** |

---

## 12. Prioritized findings

| ID | Sev | Domain | Current | Expected | Root cause | Consumers | Tests | Fix slice |
|----|-----|--------|---------|----------|------------|-----------|-------|-----------|
| F-08-08-01 | P1 → **FIXED (08-08A)** | Facility delete | ~~Cascade strips links~~ → delete blocked / RESTRICT | Historical activities remain intelligible | Was `onDelete: Cascade`; now Restrict + service guards | Planner, trainings, tournaments, events | `facility-delete-service.test.ts` | **08-08A done**; propagation reval in 08-08B |
| F-08-08-02 | P2 | Facility mutate → cache | Admin rename/archive succeeds; open planner may show old resource/facility names until manual refresh | Planner surfaces update after facility mutation | No `revalidatePlannerWeekPaths` / tag invalidation on `/api/facilities/*` | Kalender, Spielfeld, Garderobe, Liste, manipulation selectors | MISSING | 08-08B |
| F-08-08-03 | P2 | Match identity | Match pitch/dressing via `pitchCode` strings | Single FK model like training | WEEKPLANNER-01A scope left legacy fields | Match planner, availability, infoboard | PARTIAL | DEFERRED post-08-08 or dedicated migration slice |
| F-08-08-04 | P2 → **PARTIAL (08-08A)** | Legacy codes | STADION_* + Hauptfeld/Hauptplatz pair persists | Stable codes OK; block same-name facility + duplicate codes | Admin duplicate code/name guard | Duplicate lanes for distinct names | `facility-lifecycle-08-08a.test.ts` | Residual Class B pair — migration out of scope |
| F-08-08-05 | P3 | Aggregation | Inspector lacks per-type breakdown line | AGGREGATION-01 full spec | Only `trainingCount` in metrics | Aggregate inspector | PARTIAL | 08-08E optional |
| F-08-08-06 | P3 | Test harness | 14 tests fail in broad sweep (`planner-url` `search.trim`, plan-overrides mocks) | Green CI | Test props omit `search`; mock drift | CI signal | — | 08-08F test hygiene |
| F-08-08-07 | DEFERRED | Impersonation | Manual persona UAT blocked | Reliable impersonation | PEOPLE-ACCESS-IMPERSONATION-01 open | Permission UAT | N/A | Separate package |

**P0:** none identified in this diagnosis pass.

---

## 13. Proposed implementation slices (ordered)

| Slice | Problem | Domains | Invariants | Tests | Human UAT | Depends |
|-------|---------|---------|------------|-------|-----------|---------|
| **08-08A** | Facility lifecycle canonicalization + admin guards | Admin, duplicate prevention | Archive-first; delete only when unused | **DONE** — see §3A | — | — |
| **08-08B** | Mutation → revalidation + client facility-groups refresh | All planner perspectives | After facility PATCH/DELETE, planner paths revalidated; open hub refreshes labels | New API route tests asserting `revalidatePath` | Open planner during rename | 08-08A |
| **08-08C** | Conflict/availability after resource delete/archive | Conflicts, availability, historical display | No silent loss of «where» on delete | Integration tests with archived refs | Delete blocked with allocations | 08-08A |
| **08-08D** | Cross-domain integration regression pack | Training/match/tournament/event + facility | Single week read model | E2E-style vitest fixtures | Full week scenario | 08-08B |
| **08-08E** | Aggregation closure (optional) | Kalender + inspector | Shared `countByActivityType` | `aggregate-inspection` | Mixed cluster copy | — |
| **08-08F** | Final automated regression + Human UAT | All | 08-01…08-07 + FI-01 gates | Full suite green + build | Michael checklist | 08-08A–D |

**FINAL_UAT_GATE:** FACILITY-INTEGRITY-01 lifecycle matrix predominantly PASS/COVERED; no P1 open; 08-07 CLOSED; build green; documented impersonation gaps accepted or PEOPLE-ACCESS-IMPERSONATION-01 resolved.

---

## 14. Release gates (08-08 closure criteria)

| Gate | Status |
|------|--------|
| 08-07 unified planner packages on STAGE | PASS (contained) |
| FACILITY-INTEGRITY-01A | CLOSED |
| FACILITY-INTEGRITY-01 broader lifecycle | **OPEN** — matrix above |
| AGGREGATION-01 | **Partial** — headline fixed; full spec optional |
| PEOPLE-ACCESS-IMPERSONATION-01 | OPEN |
| PROD untouched | PASS |

**08-08 is NOT CLOSED.**
