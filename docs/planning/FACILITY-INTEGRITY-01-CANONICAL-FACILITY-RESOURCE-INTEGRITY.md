# FACILITY-INTEGRITY-01 — Canonical Facility & Resource Integrity

**STATUS:** IN PROGRESS (01 diagnosis/alerts **CLOSED** on STAGE; **01A CLOSED** — PR **#803**; broader propagation integrity **OPEN**)  
**HUMAN_UAT (01A):** **PASS** (Michael, 2026-10-05, R2 Vercel Preview)  
**Branch:** `cursor/facility-integrity-01-canonical-facility-resource-integrity-b94f`  
**Target:** STAGE  
**PROD:** untouched  

---

## Problem statement

Operational modules (Wochenplaner, Trainings, Spiele, Turniere, Matchcenter, Dashboard, Kalender, Infoboard, conflict detection/resolution) depend on a single tenant-scoped facility catalog (`/dashboard/admin/facilities`). Human UAT during SCE-PLANNER-UX-08-05 on FCA STAGE showed **Hauptfeld** and **Hauptplatz** as separate pitch groups in the planner while Kunstrasen 2/3 looked structurally correct.

This package is **diagnosis-first**: establish canonical persistence, lifecycle propagation, consumer sources, and FCA STAGE evidence before any destructive merge.

---

## Canonical model (summary)

| Entity | Table/Model | PK | Tenant | Parent | Active/Archive | Notes |
|--------|-------------|-----|--------|--------|----------------|-------|
| Physical facility / Anlage | `Facility` | `id` | `tenantId` | — | `FacilityStatus` ACTIVE/INACTIVE/ARCHIVED | Admin catalog row |
| Reservable resource | `FacilityResource` | `id` | `tenantId` | `facilityId` → `Facility` | same | `@@unique([tenantId, code])` |
| Pitch FULL | `FacilityResource` | `id` | tenant | facility | type `FULL_PITCH` | Gesamt |
| Pitch HALF | `FacilityResource` | `id` | tenant | facility | type `HALF_PITCH` | A/B segments |
| Dressing room | `FacilityResource` | `id` | tenant | facility (block) | type `DRESSING_ROOM` | E1–O4 FCA seed |
| Hall | `Facility` + resources | — | tenant | — | `INDOOR_HALL` / FULL_PITCH | e.g. archived Gartenhof test data |
| Activity allocation (canonical FK) | `TrainingAllocation`, `TrainingSessionAllocation`, `TournamentResourceAllocation`, `TournamentParticipantAllocation`, `EventFacilityAllocation`, `WeekplannerPlanAllocation` | various | via parent activity | — | cascade on resource delete | **IDs**, not names |
| Legacy code snapshot | `Event.pitchCode`, `*DressingRoomCode`, plan override codes | Event row | tenant | — | string codes | Still used; resolved via DB + static FCA registries |
| Occurrence override | `TrainingSessionAllocation` etc. | — | tenant | session/occurrence | — | Unchanged in this package |

**Answers**

| Question | Source |
|----------|--------|
| CANONICAL_FACILITY_SOURCE | `Facility` rows scoped by `tenantId`; admin UI + `getFacilitiesForTenant` |
| CANONICAL_RESOURCE_SOURCE | `FacilityResource` rows; selectors via `getActiveResourceOptionsForTenant` / `buildFacilityGroupsByAllocationGroupFromFacilities` |
| CANONICAL_PITCH_MODEL | One `Facility` (PITCH) with 1× FULL_PITCH + 0–2 HALF_PITCH children per physical pitch |
| CANONICAL_DRESSING_MODEL | One DRESSING_ROOM_BLOCK facility with DRESSING_ROOM resources |
| FULL_HALF_RELATIONSHIP | Sibling resources under same facility; conflict/availability uses resource **id** + type hierarchy (`lib/publishing/infoboard/facility-group.ts`, planner occupancy) |
| ACTIVITY_REFERENCE_MODEL | Primary: `facilityResourceId` on allocation tables; secondary: legacy `Event.pitchCode` strings |
| HISTORICAL_REFERENCE_MODEL | Archived resources remain readable via `withRequiredCodes` + `getFacilityResourcesByCodesForTenant` (no status filter) |

Display resolution: `getEventAllocationDisplayForTenant` → DB name first, then `lib/facilities/pitches.ts` / `dressing-rooms.ts`.

Infoboard Screen-2 **preview** still maps slot “Hauptfeld” to codes `HAUPTFELD*` with `STADION*` legacy fallback (`lib/infoboard/screen2-preview-facility-resolver.ts`) — throws if **both** sets exist.

---

## Admin lifecycle matrix (authoritative writes)

| Operation | Canonical write | References | Propagation | Historical safety | Finding |
|-----------|-----------------|------------|-------------|-------------------|---------|
| Create facility | `createFacility` | none | Planner groups reload via API | n/a | OK |
| Rename facility | `updateFacility` name | none on FK | Labels from relation refresh (planner groups, infoboard DB names) | Old names not stored on allocations | OK |
| Create resource | `createFacilityResource` | unique `(tenantId, code)` | Appears in selectors | n/a | OK |
| Rename resource | PATCH resource name | allocations by id | Live labels update | History keeps ids | OK |
| Change resource type | PATCH type | validated on assign | Group classification changes | Risk if incompatible with existing allocations | Validate on write (`facility-resource-write-validation.ts`) |
| Change pitch structure | add/remove HALF/FULL resources | hierarchy per facility | Planner lanes follow `buildPlanningResourceGroupsFromFacilityGroups` | — | Manual admin discipline |
| Archive facility/resource | status ARCHIVED | hidden from active selectors | `withRequiredCodes` retains historical codes | Readable | Preferred over delete |
| Delete resource/facility | permanent DELETE | **cascade** allocation **links** | Allocations removed; activities remain | Links stripped — data loss for “where” | Preview shows impact; **eventFacilityAllocations** now included in admin totals (FACILITY-INTEGRITY-01) |

Authorization: `FACILITIES_MANAGE` / `FACILITIES_DELETE`; tenant scoping on all queries; no permission broadening in this package.

---

## Consumer map (abbreviated)

| Consumer | Source | Identifier | Label source | Stale-risk |
|----------|--------|------------|--------------|------------|
| Admin facilities | DB | id | DB name | low |
| Wochenplaner Spielfeld/Garderobe | `buildFacilityGroupsByAllocationGroupFromFacilities` | `facilityResourceId` | DB name on group | **duplicate facilities → duplicate lanes** |
| Conflict workspace / availability | same groups + occupancy | resource id | DB + presenters | same |
| Trainings/Match/Tournament editors | active options + required codes | id / code | DB | medium if archived |
| Event legacy fields | `pitchCode` strings | code | DB map + static registry | medium |
| Infoboard live | DB active FULL/HALF + DRESSING | code | DB + static infoboard labels | **Screen-2 preview ambiguity HAUPTFELD+STADION** |
| Public presentation | `allocation-display-resolver` | code | DB preferred | medium |

---

## FCA STAGE data diagnosis (read-only, 2026-10-05)

Script: `scripts/facility-integrity-01-fca-diagnosis.ts`

### Active pitch facilities (tenant `fc-allschwil`)

| Facility | Id (prefix) | Resources |
|----------|-------------|-----------|
| **Hauptfeld** | `cmq821z9r…` (2026-06-10) | HAUPTFELD, HAUPTFELD A, HAUPTFELD B (+ archived HALLE_GARTENHOF stray) |
| **Hauptplatz** | `cmtmsld6r…` (2026-09-04) | STADION, STADION_A, STADION_B |
| Kunstrasen 2 | `cmq821znz…` | KUNSTRASEN_2, _A, _B — **canonical hierarchy OK** |
| Kunstrasen 3 | `cmq82202q…` | KUNSTRASEN_3, _A, _B — **OK** |
| Garderoben | `cmq8220ge…` | E1–E4, O1–O4 active; I3 archived |

### Hauptfeld vs Hauptplatz

**CLASSIFICATION: B — LEGACY + CANONICAL REPRESENTATION** (same physical main pitch, two facility rows)

**Evidence**

- Distinct facility IDs and names; not name-only duplication.
- Seed (`prisma/seed.ts`) upserts by **`(tenantId, name)`** → created **Hauptplatz** facility without renaming legacy **Hauptfeld** facility.
- Codes are disjoint sets: HAUPTFELD* vs STADION* (tenant-unique codes allow both).
- References (STAGE snapshot): `HAUPTFELD A` → 1× `TrainingSessionAllocation`; `STADION` → 4× `Event.pitchCode`; `STADION_A` → 1× event; Kunstrasen codes dominate event pitch codes.
- Planner UAT path moved F2 to **Hauptfeld A** (legacy id), while events still use **STADION*** codes on canonical facility.

**SAFE_TO_CONSOLIDATE:** Yes, **only** via explicit migration (FACILITY-INTEGRITY-01A) — not delete-one-side.

**RECOMMENDED_ACTION:** FACILITY-INTEGRITY-01A migration design: pick canonical target **Hauptplatz / STADION***; re-point `facilityResourceId` allocations from HAUPTFELD*; migrate or alias legacy codes; archive legacy facility; verify infoboard + planner + events.

---

## Integrity invariants (declared)

1. One canonical facility identity per physical site per tenant (FCA main pitch currently **violates** — two ACTIVE PITCH facilities).
2. One canonical resource identity per `(tenantId, code)`.
3. Labels from DB when relation/id exists.
4. Rename must not rewrite history (ids stable).
5. Historical records readable after archive (withRequiredCodes).
6. Destructive delete removes allocation links (cascade) — prefer archive when referenced.
7–15. Unchanged planner semantics (FULL/HALF conflict, tenant isolation, SFV provider data, reservation vs activity time, occurrence overrides).

---

## Remediation implemented (this package)

| Item | Status |
|------|--------|
| `lib/facilities/facility-integrity-diagnosis.ts` | **Added** — code-based duplicate detection |
| Admin integrity alerts | **Added** — `/dashboard/admin/facilities` |
| Delete preview totals | **Fixed** — include `eventFacilityAllocations` |
| Read-only FCA script | **Added** |
| Automated tests | **Added** |
| Data merge Hauptfeld→Hauptplatz | **FACILITY-INTEGRITY-01A (see below)** |
| Block delete when referenced | **Deferred** (documented; current product allows cascade after confirmation) |

---

## FACILITY-INTEGRITY-01A — FCA Main-Pitch Canonical Consolidation

**STATUS:** **CLOSED**  
**HUMAN_UAT:** **PASS** (2026-10-05)  
**PR:** **#803** → STAGE  
**PROD:** untouched  

### Pre-migration state (FCA STAGE, 2026-10-05)

| Role | Facility | Id (prefix) | Active codes |
|------|----------|-------------|--------------|
| Legacy | Hauptfeld | `cmq821z9r…` | HAUPTFELD, HAUPTFELD A, HAUPTFELD B |
| Canonical | Hauptplatz | `cmtmsld6r…` | STADION, STADION_A, STADION_B |

Classification: **B — LEGACY + CANONICAL REPRESENTATION**.

### Pre-migration reference matrix (STAGE snapshot)

| Source | Reference type | Legacy | Target | Action |
|--------|----------------|--------|--------|--------|
| TrainingAllocation | facilityResourceId | 0 | 0 | — |
| TrainingSessionAllocation | facilityResourceId | 1 | 0 | Re-point HAUPTFELD A → STADION_A |
| TournamentResourceAllocation | facilityResourceId | 0 | 0 | — |
| TournamentParticipantAllocation | facilityResourceId | 0 | 0 | — |
| EventFacilityAllocation | facilityResourceId | 0 | 0 | — |
| WeekplannerPlanAllocation | facilityResourceId | 0 | 0 | — |
| Event.pitchCode | pitchCode | 0 | 5 | Preserve STADION* |

### Canonical target decision

| Field | Value |
|-------|-------|
| **FACILITY** | Hauptfeld (`cmtmsld6r…` after 01A consolidation) |
| **FULL (Gesamt)** | STADION → display **Hauptfeld** |
| **HALF A** | STADION_A → display **Hauptfeld A** |
| **HALF B** | STADION_B → display **Hauptfeld B** |
| **WHY** | Technical codes remain STADION* (SFV/Event.pitchCode); human-facing FCA terminology is **Hauptfeld** (01A-R2 product decision) |
| **LEGACY_ALIASES_REQUIRED** | Yes — read/display only |
| **LEGACY_ALIAS_STRATEGY** | `lib/facilities/fca-main-pitch-legacy-codes.ts` + `getPitchAllocationByCode()` maps HAUPTFELD* → static STADION* definitions; archived DB rows keep HAUPTFELD codes for audit |

### Migration algorithm (idempotent, tenant `fc-allschwil` only)

1. Validate B_LEGACY_AND_CANONICAL shape; abort on unexpected facilities/codes.
2. Re-point FK allocations from legacy resource ids → canonical ids (merge duplicate parent rows).
3. Migrate any legacy `Event.pitchCode` strings to STADION* (none on STAGE pre-migration).
4. Verify zero remaining FK / pitchCode references on legacy ids.
5. Archive legacy HAUPTFELD* resources and Hauptfeld facility (no cascade delete).
6. Postcondition: exactly one active main-pitch PITCH facility; no `LEGACY_CANONICAL_MAIN_PITCH_PAIR` finding.

Script: `scripts/facility-integrity-01a-fca-reconcile.ts` (`--inventory`, `--dry-run`, `--execute --confirm FIX-FCA-MAIN-PITCH`).  
Requires `APP_ENV=stage` + `SCE_OPERATION_AUTHORIZATION=facility-integrity-01a-fca-reconcile:stage` for remote execute. Refuses PROD URLs.

### Seed correction

`prisma/seed.ts` uses `resolveFcaFacilityForSeed()` — main pitch anchors on STADION* or legacy HAUPTFELD* resource codes, not display name alone (`lib/facilities/fca-facility-seed.ts`).

### STAGE execution (2026-10-05)

| Metric | Before | After |
|--------|--------|-------|
| Active main-pitch facilities | 2 | 1 |
| TrainingSessionAllocation on legacy HALF A | 1 | 0 |
| TrainingSessionAllocation on STADION_A | 0 | 1 |
| Event.pitchCode STADION* | 5 | 5 |
| Legacy facility/resources | ACTIVE | ARCHIVED |

F2 occurrence (08-05 UAT): session `cmsoxnk2e…` retains sporting window 17:00–18:30 (UTC+2); allocation now on **Hauptfeld A** (`STADION_A`).

### FACILITY-INTEGRITY-01A-R2 — Canonical terminology (Hauptfeld)

**STATUS:** **CLOSED** (included in **#803**)  
**HUMAN_UAT:** **PASS** (2026-10-05)  
**PROD:** untouched  

| Layer | R1 (Hauptplatz) | R2 (Hauptfeld) |
|-------|-----------------|----------------|
| Facility.name | Hauptplatz | **Hauptfeld** |
| STADION resource | Hauptplatz | **Hauptfeld** |
| STADION_A | Hauptplatz A | **Hauptfeld A** |
| STADION_B | Hauptplatz B | **Hauptfeld B** |
| Technical codes | STADION / STADION_A / STADION_B | unchanged |
| Static fallback (`pitches.ts`) | Stadion / Stadion – Feld A/B | **Hauptfeld / Hauptfeld A/B** |

Implementation:

- `lib/facilities/fca-main-pitch-canonical-terminology.ts` — canonical display names
- `lib/facilities/fca-main-pitch-terminology-reconciliation.ts` — idempotent STAGE rename (tenant `fc-allschwil` only)
- `scripts/facility-integrity-01a-r2-fca-terminology.ts` — `--inventory`, `--dry-run`, `--execute --confirm FIX-FCA-MAIN-PITCH-TERMINOLOGY`
- `prisma/seed.ts` — seed upserts Hauptfeld names on STADION* anchor
- 01A consolidation execute applies the same terminology step post-merge

Presentation priority (unchanged from R1): **FacilityResource.name** → facility + subdivision → static registry → code.

**STAGE data (read-only verify, 2026-10-05 closure):** Neon `ep-wispy-hall-aso93dy6`, tenant `fc-allschwil` — facility **Hauptfeld** (`cmtmsld6r…`); resources **Hauptfeld / Hauptfeld A / Hauptfeld B** on codes **STADION / STADION_A / STADION_B**; R2 inventory `alreadyCanonical: true`; legacy HAUPTFELD* facility/resources **ARCHIVED**; integrity findings **[]**.

**DISPLAY NAME ≠ STABLE RESOURCE CODE:** human-facing labels use **Hauptfeld***; persisted codes and `Event.pitchCode` remain **STADION*** (intentional stable identifiers). R2 did **not** change resource IDs, allocation FKs, event pitchCode values, Kunstrasen 2/3, or Garderoben.

### Tests added

- `lib/facilities/__tests__/fca-main-pitch-consolidation.test.ts`
- `lib/facilities/__tests__/fca-main-pitch-reconciliation.test.ts`
- `lib/facilities/__tests__/fca-facility-seed.test.ts`
- Legacy pitchCode readability via `pitches.ts`

### Residual risks (01A)

- Human UAT still required across Wochenplaner, Infoboard, Matchcenter (automated coverage is partial).
- Rollback: restore archived facility/resources + reverse id map from backup JSON (manual; no auto-rollback script in this slice).
- Cross-environment: PROD must run the same script separately after STAGE UAT — not executed here.

### Human UAT closure (Michael — R2 Vercel Preview, 2026-10-05)

| Surface | Result | Evidence |
|---------|--------|----------|
| **Admin → Anlagen & Ressourcen** | **PASS** | Single active main-pitch hierarchy: **Hauptfeld** → Gesamt **Hauptfeld**, halves **Hauptfeld A/B**; visible **Hauptplatz** terminology absent for canonical set |
| **Infoboard → Vorschau** | **PASS** | Screen 1, 28/09/2026 16:00, Junioren F2 → **HAUPTFELD A** (canonical presentation via STADION_A allocation) |
| **Matchcenter** | **PASS** | Resource UI shows **Hauptfeld / Hauptfeld A / Hauptfeld B** with canonical facility name under cards |

**FACILITY-INTEGRITY-01A HUMAN_UAT = PASS** — Admin, Infoboard, and Matchcenter facility presentation confirmed.

### INFOBOARD_CANONICAL_PRESENTATION (01A-R1 + R2)

| Check | Status |
|-------|--------|
| R1 implementation | **R1_IMPLEMENTED** |
| R2 terminology | **CLOSED** |
| Human UAT | **PASS** |
| allocation integrity | PASS |
| resolver integrity | PASS |
| Matchcenter canonical naming | **PASS** |
| Infoboard availability | PASS |
| Infoboard canonical naming | **PASS** |
| PROD | untouched |

### UAT follow-ups (explicitly **not** in PR #803)

| Id | Topic | Status |
|----|-------|--------|
| **A** | Planner resource availability alignment — status labels (**Belegt**, **Teilweise**, **Aktuell · Konflikt**) need a consistent column/alignment system | OPEN |
| **B** | Planner/calendar clipped activity information — accessible hover **and** keyboard focus detail for truncated compact cards | OPEN |
| **C** | Planner aggregation semantics — mixed clusters must not read as all trainings (target: `10 Aktivitäten · 9 Trainings · 1 Spiel · 8 Konflikte`) — see **SCE-PLANNER-UX-AGGREGATION-01** | PLANNED |
| **D** | People & Access impersonation (Club Admin) — **PEOPLE-ACCESS-IMPERSONATION-01** | OPEN / SEPARATE |
| **E** | Broader facility propagation/integrity — create/rename/delete must propagate across Wochenplaner, Trainings, Spiele, Turniere, Vereinsveranstaltungen, availability, conflict detection, Infoboard, read models | **FACILITY-INTEGRITY** stream continues |

---

## Tests

- `lib/facilities/__tests__/facility-integrity-diagnosis.test.ts`
- `components/admin/facilities/__tests__/FacilityIntegrityAlerts.test.tsx`
- Planner regression: existing `sce-planner-ux-08-0[2-5]*` suites (unchanged architecture)

---

## Human UAT plan (not executed by agent)

A. Admin shows canonical FCA structure **after 01A**.  
B. Hauptfeld/Hauptplatz duplicate groups resolved **if 01A consolidation approved**.  
C–D. Kunstrasen + Garderoben unchanged.  
E–H. Planner/conflict/availability single identity per pitch.  
I. Rename propagation spot-check.  
J. Delete/archive safety.  
K. Training occurrence allocations remain valid.  
L. Infoboard matches admin catalog.

---

## Residual risks (package)

- FCA STAGE main-pitch duplicate **reconciled and UAT-closed in 01A** (#803); PROD still requires separate authorized migration if/when approved.
- Screen-2 preview throws only when **both** HAUPTFELD and STADION code sets are simultaneously **active** (resolved on STAGE after 01A execute).
- Permanent delete still cascades allocation links when confirmed.
- Follow-ups **A–E** above remain open; do not conflate 01A closure with full cross-module propagation hardening.

---

## Related documents

- SCE-PLANNER-UX-08-01 (FACILITY-MODEL-01 backlog)
- SCE-PLANNER-UX-08-05 (Human UAT surfaced duplicate)
- PLANNING-UX-07R5 / MASTERDATA-CONSISTENCY-02
