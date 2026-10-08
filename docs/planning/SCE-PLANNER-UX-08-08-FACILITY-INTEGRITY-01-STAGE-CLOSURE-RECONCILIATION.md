# SCE-PLANNER-UX-08-08 / FACILITY-INTEGRITY-01 — STAGE closure reconciliation

**Run:** SCE-PLANNER-UX-08-08-CLOSURE / FACILITY-INTEGRITY-01  
**Date:** 2026-10-08  
**Branch audited:** `STAGE`  
**HEAD (canonical STAGE baseline):** `1db732b90cda3f10f7fb31bd0c41c48ec7023678`  
**PROD:** untouched  

---

## Package status

| Package | Status |
|---------|--------|
| **SCE-PLANNER-UX-08-08** | **CLOSED** — delivered via PR **#806** (merge `84c5e7acdce92d9efd256bf9b0ca1939ad101d27`); ancestor of current STAGE |
| **FACILITY-INTEGRITY-01** | **CLOSED** — diagnosis/01A (#803) + broader lifecycle/UAT closed with 08-08 (#806) |

Authoritative detail: [`SCE-PLANNER-UX-08-08-INTEGRATION-INTEGRITY-FINAL-UAT.md`](./SCE-PLANNER-UX-08-08-INTEGRATION-INTEGRITY-FINAL-UAT.md), [`FACILITY-INTEGRITY-01-CANONICAL-FACILITY-RESOURCE-INTEGRITY.md`](./FACILITY-INTEGRITY-01-CANONICAL-FACILITY-RESOURCE-INTEGRITY.md).

---

## Delivery reconstruction (08-08 revisions)

| Revision | Classification | Evidence on STAGE |
|----------|----------------|-------------------|
| **08-08A** | **CONTAINED** | `facility-delete-service.ts`, `facility-resource-reference-guard.ts`, migration `20261008120000_sce_planner_ux_08_08a_facility_resource_delete_restrict` |
| **08-08B** | **CONTAINED** | `facility-mutation-revalidation.ts`, API routes call `revalidateAfterSuccessfulFacilityMutation()` |
| **08-08C** | **CONTAINED** | `sce-planner-ux-08-08c-conflict-availability-integrity.test.ts`; ACTIVE-only availability fix |
| **08-08C/R1** | **CONTAINED** | `FacilityResourceCodeAlias`, migration `20261008140000_sce_planner_ux_08_08c_r1_match_resource_code_alias`, `match-legacy-resource-compatibility.ts` |
| **08-08D** | **CONTAINED** | `sce-planner-ux-08-08d-cross-domain-integration.test.ts` |
| **08-08F** | **CONTAINED** | Harness fixes on #806 branch (`90ccd81f`); broad sweep green at 08-08F closure |

**RESULT:** All material 08-08 slices **CONTAINED** on STAGE; nothing **MISSING** for integrity closure.

---

## Human UAT (FI-01 → FI-08)

Recorded in §3G of the 08-08 final UAT doc (Product Owner, 2026-10-08, PR #806 preview + FCA STAGE). **Not re-run** in this reconciliation agent.

| Case | Classification |
|------|----------------|
| FI-01 | **PASS_HUMAN_UAT** |
| FI-02 | **PASS_HUMAN_UAT** |
| FI-03 | **PASS_HUMAN_UAT** (dressing-room rename) |
| FI-04 | **PASS_HUMAN_UAT** |
| FI-05 | **PASS_HUMAN_UAT** |
| FI-06 | **PASS_HUMAN_UAT** |
| FI-07 | **PASS_HUMAN_UAT** |
| FI-08 | **PASS_HUMAN_UAT** |

**HUMAN_UAT_GAPS:** None for Facility Integrity. Persona/impersonation UAT remains under **PEOPLE-ACCESS-IMPERSONATION-01** (separate; merged on STAGE as #808 after #806).

---

## Automated evidence (this reconciliation run)

| Suite | Result |
|-------|--------|
| Facility / 08-08 integrity gate (8 files) | **95 / 95 PASS** |
| Focused 08 + integrity (excl. permission sentinel) | **236 / 236 PASS** (25 files) |
| Broad planner/facilities sweep | **1062 PASS**, **2 FAIL** (see known debt) |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run build` | **PASS** (exit 0) |
| `prisma migrate status` | **Database schema is up to date** (222 migrations) |

### Known non-blocking test debt (post–#808 STAGE)

| Item | Classification |
|------|----------------|
| `WeekPlannerPage.canonical-edit-permissions.test.tsx` | **KNOWN_P2_FAILURES** — planner edit gating harness drift after People/Access navigation changes |
| `PlanningHubListeRowMenu.test.tsx`, `AggregatedActivityInspectionDialog.test.tsx` | **KNOWN_P2_FAILURES** — unrelated to facility lifecycle; aggregation/permission UI tests |

**NEW_FAILURES (facility / product integrity):** **0**

---

## Closure decision

| Gate | Outcome |
|------|---------|
| Pitch + dressing lifecycle safe | **YES** |
| Referenced delete blocked (app + RESTRICT FK) | **YES** |
| Legacy Match code compatibility | **YES** |
| Cross-domain consistency | **YES** (automated 08-08D + Human UAT) |
| Freshness / revalidation | **YES** (08-08B) |
| Build + migrations | **YES** |
| **SCE-PLANNER-UX-08-08** | **CLOSED** |
| **FACILITY-INTEGRITY-01** | **CLOSED** |

---

## Deferred (out of scope)

- WeekPlanner canonical-edit-permissions unit-test debt — **P2 TEST DEBT**
- Planner inspector activity-type breakdown — **SCE-PLANNER-UX-AGGREGATION-01**
- SCE-COLLAB-01 — **not started**

---

## PR / Git cleanup

- **PR #806:** **MERGED** — no further merge required; historical package record closed at merge SHA `84c5e7ac`.
- Obsolete open PR for 08-08: **none** found.
