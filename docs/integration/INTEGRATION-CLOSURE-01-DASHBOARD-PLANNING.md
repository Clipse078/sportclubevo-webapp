# INTEGRATION-CLOSURE-01 — Dashboard + Planning reconciliation

**Date:** 2026-09-24  
**Repo:** Clipse078/sportclubevo-webapp  
**STAGE baseline:** `a49190300247ca766160ab402c8b6dc96596b4be`  
**#707 HEAD (authoritative integration candidate):** `e01e762358f9a6b54ad68c7766e11212fffd63fb`  
**#706 HEAD (parallel programme):** `59efcaf6cb8b8f4352836e1d06415d9862d909b8`

## Incident timeline

1. Personal dashboard programme (DASHBOARD-D … 07R1E) landed on PR **#706** only; never merged to `STAGE`.
2. PR **#707** (PLANNING-UX-05R2) was cut from `STAGE`, so its preview initially showed the **legacy club-centric dashboard** (`getCommandCenterData`, KPI strip, Heute im Verein). Not a revert — **integration base error**.
3. Dashboard commits `8f592373^..73d66e52` were cherry-picked onto #707 (equivalent patches, new SHAs). Current #707 restores the **personal command center** plus `cf4fc108` (05R2).
4. #706 continued with **PLANNING-UX-04/05/05R1**, training UX-03R1/R2, and schema migration `20260924153000_planning_ux_05r1_operational_parity` — **not** on #707.

## Commit reconciliation matrix

Common merge-base with `STAGE`: `a49190300247ca766160ab402c8b6dc96596b4be`.

| Checkpoint | Domain | #706 SHA | #707 SHA | Patch relation | Presence |
|------------|--------|----------|----------|----------------|----------|
| DASHBOARD-D | DOCS | `8f592373` | `d094e410` | `patch-id` match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-01 | DASHBOARD | `8b9af37e` | `093bc215` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-02 | DASHBOARD | `1563c7bf` | `e2df0bd0` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-03 | DASHBOARD | `38a7adc6` | `ad5dca1f` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-04 migration | MIGRATION | `f04beb9f` | `26d0ad4a` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-04 UI | DASHBOARD | `fd7487c4` | `44fae4e8` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-04 API/registry | DASHBOARD | `d1cdaca2` | `39910761` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-04A docs | DOCS | `d7e85628` | `d4251a90` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-05 | DASHBOARD | `f0611096` | `dd223f98` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-06 | DASHBOARD | `008c04df` | `395edb3b` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-06 tests | SHARED | `2a4fa3bb` | `e3de14c5` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-07 loader fix | DASHBOARD | `76ca9e8d` | `6ac5b894` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-07 docs | DOCS | `f2431d23` | `ff4d7aad` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-07R1 | DASHBOARD | `28fccaf8` | `c71188e3` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-07R1A | DASHBOARD | `7263ce04` | `368de457` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-07R1B | DASHBOARD | `88dd4f36` | `dff653cc` | match | EQUIVALENT_PATCH_BOTH |
| STAGE TeamSeason scope | DASHBOARD | `f4fbb9f2` | `4544748e` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-07R1D | DASHBOARD | `5d8f0726` | `23512d83` | match | EQUIVALENT_PATCH_BOTH |
| DASHBOARD-07R1E | DASHBOARD | `73d66e52` | `98b119af` | match | EQUIVALENT_PATCH_BOTH |
| P0 forensics doc | DOCS | — | `e01e7623` | — | ONLY_707 |
| PLANNING-UX-05R2 | PLANNING | — | `cf4fc108` | consolidated port | ONLY_707 |
| Training UX-03 rebuild | PLANNING | `59e664f9` | — | — | ONLY_706 |
| Training UX-03R1/R2 | PLANNING | `5d65b1ab`, `55acfe7f` | — | — | ONLY_706 |
| PLANNING-UX-04 | PLANNING | `f615438c` | — | superseded by 05R2 port | SUPERSEDED_IN_707 |
| PLANNING-UX-05 | PLANNING | `14d7633e` | — | superseded by 05R2 port | SUPERSEDED_IN_707 |
| PLANNING-UX-05 test fix | SHARED | `a8fe7876` | — | — | ONLY_706 |
| PLANNING-UX-05R1 + migration | PLANNING/MIGRATION | `5d6b49ae` | — | not in 05R2 scope | ONLY_706 |
| Requirement link API | PLANNING | `59efcaf6` | — | — | ONLY_706 |

**Conflicting:** none at patch level for dashboard programme. Planning diverges by **design** (#707 single 05R2 commit vs #706 multi-commit stack + 05R1 schema).

## Authoritative superset decision

| Question | Answer |
|----------|--------|
| A. Personal dashboard complete on #707? | **YES** — all D…07R1E behavior present via equivalent patches. |
| B. Planning for **05R2** on #707? | **YES** — compact selectors, operational editors, SFV Wochenplan regression tests. |
| C. Planning commits only on #706? | **YES** — 05R1 parity, requirement-resource links, participation audience APIs, training session participant roster stack. |
| D. Nature of #706-only work | **Necessary only if product accepts 05R1 programme**; for 05R2 closure it is **parallel/superseded or deferred**, not accidental dashboard contamination. |
| E. Merge #706 after #707? | **UNSAFE** — reintroduces alternate planning implementation, `20260924153000_planning_ux_05r1_operational_parity`, duplicate editor wiring, composition regressions. |
| F. Merge #707 alone loses functionality? | **Loses #706-only 05R1/training UX-03R stack**; does **not** lose personal dashboard or 05R2 contracts. |

## Protected dashboard contract

Active route: `app/(admin)/dashboard/page.tsx` → `ClubDashboardView` → `getPersonalCommandCenterData`.

Legacy **not** in active composition: `DashboardMetricStrip`, `HeuteImVereinWidget`, `getCommandCenterData`, tenant-wide registration KPI, legacy Schnellaktionen primary launcher.

Hierarchy: identity → Schnellzugriff → Mein Programm + Mein Kalender → attention → tasks → secondary.

## Protected planning contract (05R2 on #707)

- `CompactOperationalResourceSelector`: green pitch/hall (`emerald`), blue dressing room semantics, compact chips (no `PitchVisual` on operational forms).
- Training / Match / Tournament / Veranstaltung create-edit surfaces use shared planning-editor language; Wochenplaner keeps richer availability visualization where needed.
- Publication + SFV HOME Wochenplan: guarded by `planning-ux-05-operational.test.ts` and `planning-ux-05r2-sfv-wochenplan-regression.test.ts`.

## D04 migration (`20260923210000_dashboard_04_quick_access_preference`)

| Field | Value |
|-------|--------|
| Repo SHA256 | `388b348864d023c5eaabf33ac80a9a79c87303fffbdae1995f483163ceaa9ca4` |
| SQL | `CREATE TABLE UserDashboardQuickAccessPreference`, unique `(tenantId,userId)`, FKs to Tenant/User CASCADE |
| Forward-only | YES |
| Touches existing rows | NO (new table) |
| STAGE host | `ep-wispy-hall-aso93dy6` |
| STAGE database | `neondb` |
| STAGE fingerprint | `acd3b37682911890` |
| **Ledger entry (read-only verify 2026-09-24)** | **YES** (applied `2026-09-23T21:31:46.312Z`, checksum matches repo) |
| **Table exists** | **YES** |
| Partial/failed dashboard migrations | **NONE** |

> Task brief expected ledger/table **NO/NO**; live STAGE state is **already migrated** (DASHBOARD-04A deployment). No write performed during closure.

## Migration order safety

Chronology on `STAGE` repo chain:

`… workspace_08_05` → **`dashboard_04_quick_access`** → `workspace_08_06` → `workspace_08_07`

D04 is **already applied** on STAGE between W08 migrations. For #707 merge:

- **NORMAL_MIGRATE_DEPLOY_SAFE:** YES for dashboard D04 (no-op on STAGE).
- #706-only `20260924153000_planning_ux_05r1_operational_parity` is **not** on #707; do not merge #706 without a controlled migration plan for that schema.

Historical checksum drift elsewhere: document only; do not repair in this task.

## Regression prevention

- Structural tests: `dashboard-06-composition`, `dashboard-07r1-composition`, `dashboard-07-acceptance`, `integration-closure-01-personal-dashboard-route`.
- Process: `docs/integration/INTEGRATION-BASE-RULE.md`.

## Recommended integration sequence

1. **Do not merge #706.**
2. Mark #706 **superseded** (close with pointer to #707) after stakeholder confirms 05R1 stack is deferred or will be a **new** PR rebased on post-#707 `STAGE`.
3. **Merge #707** → `STAGE` (single integration PR for personal dashboard + 05R2).
4. **Post-merge:** run read-only migration verify; D04 should remain applied; no D04 deploy required on STAGE.
5. Preview / acceptance: `/dashboard` personal command center + planning operational smoke (Vercel #707 preview).
6. If 05R1 is still required product-wise: extract commits from #706 tip (`5d6b49ae`, `59efcaf6`) onto fresh branch from updated `STAGE` — **do not** merge #706 wholesale.

## Residual risks

- Two open PRs until #706 is closed — human merge order error.
- 05R1 functionality remains unintegrated until explicitly ported.
- `resource-card-selection-style.test.ts` expects legacy `sce-primary` selection tokens; 05R2 uses emerald/primary ring — known baseline mismatch (not in focused closure suite).

## PR state (closure task)

- **#706:** OPEN, target STAGE, head `59efcaf6` — do not merge in this closure.
- **#707:** OPEN DRAFT, target STAGE, head `e01e762` (+ closure commits) — authoritative integration candidate.
- **STAGE_DB_WRITE / PRODUCTION_DB_WRITE:** NO during this task.

---

## Addendum — PLANNING-INTEGRATION-P0R1 (product-level route verification)

**Date:** 2026-09-24

Product acceptance on the #707 preview showed that **technical** 05R2 completeness (components present in repo) did not guarantee **active routes** mounted the accepted Planning editor — notably `/dashboard/training/sessions/[id]/edit` (legacy light-card shell) and incomplete 05R1 sections on Veranstaltung edit.

P0R1 reconciles #707 with the #706-only Training UX-03/R and PLANNING-UX-05R1 operational patches while **keeping** the protected personal dashboard and **05R2 compact resource selectors** on training/match/tournament create surfaces. See `docs/integration/PLANNING-INTEGRATION-P0R1-PRODUCT-RECONCILIATION.md`.

**Do not merge #707 until P0R1 acceptance completes.** Saisonplaner `/dashboard/planner/edit/[id]` remains explicitly deferred (legacy form unchanged on #706 as well).
