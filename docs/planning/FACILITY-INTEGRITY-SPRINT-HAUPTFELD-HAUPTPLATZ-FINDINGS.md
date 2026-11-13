# FACILITY-INTEGRITY Sprint — Hauptfeld / Hauptplatz findings (read-only)

| Field | Value |
| --- | --- |
| **Date** | 2026-11-13 |
| **Tenant** | `fc-allschwil` (FCA STAGE evidence) |
| **Classification** | **B — LEGACY + CANONICAL REPRESENTATION** (not application code defect) |
| **Runtime DB executed** | **NO** (this document cites archived diagnosis + pure diagnosis helpers) |

## Evidence summary

Human UAT and read-only script `scripts/facility-integrity-01-fca-diagnosis.ts` (documented in `FACILITY-INTEGRITY-01-CANONICAL-FACILITY-RESOURCE-INTEGRITY.md`, 2026-10-05) found **two active pitch facilities** for the same physical Brüel main pitch:

| Facility (name) | Resource codes (active) | Created (STAGE snapshot) |
| --- | --- | --- |
| **Hauptfeld** | `HAUPTFELD`, `HAUPTFELD A`, `HAUPTFELD B` | 2026-06-10 |
| **Hauptplatz** | `STADION`, `STADION_A`, `STADION_B` | 2026-09-04 |

Kunstrasen 2/3 facilities show **canonical hierarchy OK** (single facility per pitch, FULL + HALF children).

## Diagnosis logic (automated, no DB)

`lib/facilities/facility-integrity-diagnosis.ts`:

- Emits `LEGACY_CANONICAL_MAIN_PITCH_PAIR` when **both** `FCA_LEGACY_MAIN_PITCH_CODES` and `FCA_CANONICAL_MAIN_PITCH_CODES` are present on active resources.
- `classifyHauptfeldHauptplatzPair` → **`B_LEGACY_AND_CANONICAL`** when legacy + canonical code sets coexist on **≥2 facility rows**.

This is **duplicate catalog representation** (two `Facility` rows + two code families), not inconsistent naming in code paths and not a missing revalidation hook.

## Operational impact (verified wiring vs runtime data)

| Domain | Impact |
| --- | --- |
| **Wochenplaner** | Two Spielfeld **lane groups** for one physical pitch (`buildFacilityGroupsByAllocationGroupFromFacilities`) |
| **Conflict / availability** | Occupancy correct **per resource id**, but planners may assign to “wrong” twin group |
| **Infoboard Screen-2 preview** | Resolver throws if **both** `HAUPTFELD*` and `STADION*` active (`lib/infoboard/screen2-preview-facility-resolver.ts`) |
| **Legacy Event.pitchCode** | Still resolvable via aliases, but human labels split across groups |
| **Automated sprint audit (#970)** | API mutation → `revalidateAfterSuccessfulFacilityMutation` wired; **does not prove** STAGE data is consolidated |

## What this is **not**

- Not a regression introduced by SCE-MTG / task / finance packages in this sprint.
- Not fixable by deleting one facility without **FACILITY-INTEGRITY-01A**-style reference migration (allocations use `facilityResourceId`; blind delete strips links).

## Reconciliation recommendation (requires PO / data authorization)

1. **Run** `DATABASE_URL=<stage> npx tsx scripts/facility-integrity-01-fca-diagnosis.ts` before any action — fresh inventory.
2. **Treat Hauptplatz (`STADION*`) as canonical target** per seed docs (`fca-main-pitch-canonical-terminology.ts`).
3. **Migrate references** from `HAUPTFELD*` resource ids → `STADION*` ids using existing consolidation helpers (`fca-main-pitch-consolidation.ts`, alias upserts) — **no merge in this sprint**.
4. **Archive** legacy `Hauptfeld` facility after zero active allocations reference legacy ids.
5. **Verify** Wochenplaner single main-pitch group + Infoboard preview in PO UAT.

## Automated vs runtime integrity

| Layer | Sprint deliverable | Status |
| --- | --- | --- |
| API revalidation + guards | `facility-integrity-sprint-audit.test.ts` | **Pass** (source assertions) |
| Tenant data twin main pitch | STAGE diagnosis | **Open** — data/reconciliation decision |
