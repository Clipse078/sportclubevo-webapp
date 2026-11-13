# FACILITY-INTEGRITY-01A — FCA Hauptfeld/Hauptplatz reconciliation runbook

| Field | Value |
| --- | --- |
| **Status** | **REVIEWABLE** — no execution in sprint |
| **Tenant scope** | `fc-allschwil` only (`FCA_TENANT_KEY`) |
| **Automation** | `scripts/facility-integrity-01a-fca-reconcile.ts`, `lib/facilities/fca-main-pitch-reconciliation.ts` |
| **Sprint finding** | `FACILITY-INTEGRITY-SPRINT-HAUPTFELD-HAUPTPLATZ-FINDINGS.md` (classification **B_LEGACY_AND_CANONICAL**) |

## 1. Objective

Consolidate **one physical Brüel main pitch** from two facility rows (legacy **Hauptfeld** + canonical **Hauptplatz**) into a **single canonical facility** with one code family (`STADION`, `STADION_A`, `STADION_B`), migrating **all FK references** off legacy `HAUPTFELD*` resource IDs.

**Not claimed:** Merging rows does not by itself prove cross-resource occupancy was globally correct while twins existed — planners could assign conflicting activities to the twin lane groups. Post-reconciliation verification must include conflict/occupancy smoke on **one** group.

## 2. Source / target selection criteria

| Role | Selection rule | FCA STAGE evidence |
| --- | --- | --- |
| **Legacy source facility** | Active facility owning **all** `FCA_LEGACY_MAIN_PITCH_CODES` (`HAUPTFELD`, `HAUPTFELD A`, `HAUPTFELD B`) | Facility name **Hauptfeld** (created 2026-06-10) |
| **Canonical target facility** | Active facility owning **all** `FCA_CANONICAL_MAIN_PITCH_CODES` (`STADION`, `STADION_A`, `STADION_B`) | Facility name **Hauptplatz** (created 2026-09-04) |
| **Abort / no-op** | `diagnoseTenantFacilityIntegrity` → not `B_LEGACY_AND_CANONICAL`, or `countActiveMainPitchFacilities !== 2` | Script exits “already consolidated” |
| **Out of scope** | Kunstrasen 2/3, dressing blocks, halls, other tenants | Diagnosis OK on those facilities |

Code mapping: `FCA_MAIN_PITCH_LEGACY_TO_CANONICAL` in `lib/facilities/fca-main-pitch-legacy-codes.ts`.

## 3. Reference inventory (historical + future)

`buildReferenceMatrix` / `collectReferenceCounts` enumerate per **resource code**:

| Reference source | Model / field | Temporal |
| --- | --- | --- |
| Training allocations | `TrainingAllocation.facilityResourceId` | Past + future sessions |
| Session overrides | `TrainingSessionAllocation.facilityResourceId` | Per-occurrence |
| Tournaments | `TournamentResourceAllocation`, `TournamentParticipantAllocation` | Scheduled events |
| Weekplanner | `WeekplannerPlanAllocation.facilityResourceId` | Planned + historical plans |
| Match/event allocations | `EventFacilityAllocation.facilityResourceId` | Linked events |
| Legacy string refs | `Event.pitchCode` | Historical + upcoming if code set |

**Read-only commands (authorized STAGE `DATABASE_URL` only):**

```bash
npx tsx scripts/facility-integrity-01a-fca-reconcile.ts --inventory
npx tsx scripts/facility-integrity-01a-fca-reconcile.ts --dry-run
```

Outputs: `INVENTORY` JSON, `PRE_MIGRATION_REFERENCE_MATRIX` TSV (legacy count → target count, temporal, planned action).

## 4. Collision / conflict analysis

When both code families are active:

| Risk | Mechanism | Post-merge expectation |
| --- | --- | --- |
| **Twin lane groups** | `buildFacilityGroupsByAllocationGroupFromFacilities` emits two Spielfeld groups | Single group after FK migration |
| **Split assignments** | Same time window may hold allocations on **different resource IDs** for the same pitch | **Manual review** of overlapping `WeekplannerPlanAllocation` / trainings on legacy vs canonical IDs for same calendar week (dry-run matrix highlights non-zero legacy counts) |
| **Screen-2 preview** | Resolver throws if both code sets active | Should resolve after legacy resources archived |
| **Occupancy engine** | Per-resource internal consistency ≠ global exclusivity across twins | PO smoke: two teams same slot on different twin IDs **before** merge is possible; **after** merge, conflicts surface in single group |

Automated dry-run does **not** simulate merged occupancy — PO must spot-check one busy Wochenplaner week.

## 5. Preconditions & dry-run counts

| Precondition | Check |
| --- | --- |
| Tenant | `Tenant.key === fc-allschwil` |
| Environment | Not PROD (`detectEnvironment` blocks PROD URLs) |
| Authorization | `--execute` requires `SCE_OPERATION_AUTHORIZATION=facility-integrity-01a-fca-reconcile:stage` + `--confirm FIX-FCA-MAIN-PITCH` |
| Shape | No missing HALF/FULL children on canonical row; legacy row mappable 1:1 |
| Diagnosis | `LEGACY_CANONICAL_MAIN_PITCH_PAIR` / `B_LEGACY_AND_CANONICAL` |

Dry-run prints `resourceIdMap` (legacy id → canonical id per code) and counts of rows slated for update vs duplicate removal (`ReconciliationStats`).

## 6. Transaction, rollback, verification

**Execute path** (`executeFcaMainPitchReconciliation`):

1. Single DB transaction (allocation FK rewrites, duplicate allocation removal, `Event.pitchCode` string updates, legacy resources **ARCHIVED**, legacy facility **ARCHIVED**).
2. Terminology pass: `applyFcaMainPitchCanonicalTerminologyInTransaction` (01A-R2).
3. **Rollback:** No automatic rollback — restore from DB backup/snapshot if execute fails mid-flight; script aborts on errors before commit when validation fails.
4. **Post-change verification:**
   - Re-run `--inventory` → `alreadyConsolidated`, `activeMainPitchFacilityCount === 1`
   - `POST_MIGRATION_REFERENCE_MATRIX` — legacy counts **0** on migration targets
   - `diagnoseTenantFacilityIntegrity` → no `B_LEGACY_AND_CANONICAL`
   - App: `revalidateAfterSuccessfulFacilityMutation` paths (admin facility writes); **full-route** `revalidatePath` for weekplanner + infoboard after execute (PO checklist)
   - Human: Wochenplaner single Hauptplatz group; training picker; infoboard Screen-2 preview

## 7. Cache / revalidation

| Surface | Requirement |
| --- | --- |
| Admin facilities list | Existing mutation revalidation (`revalidateAfterSuccessfulFacilityMutation`) |
| Wochenplaner facility groups | Hard refresh / layout revalidation post-execute |
| Infoboard preview resolver | Depends on single active code family |
| Conflict workspace | Reload groups after consolidation |

Sprint PR #970 wiring audit proves **hook presence**, not STAGE data consolidated.

## 8. Explicit non-goals (this runbook)

- No cross-tenant template
- No hard DELETE of facilities (archive only)
- No claim that pre-merge twin occupancy was globally conflict-free
- **No execution** until PO signs execute gate + backup window
