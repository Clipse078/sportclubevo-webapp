# DASHBOARD P0 — Regression forensics & restoration (2026-09-24)

## INCIDENT

The PLANNING-UX-05R2 preview deployment (`cursor/planning-ux-05r2-visual-refinement`, PR **#707**) rendered the **legacy club-centric dashboard** (large hero, four KPI counters, Meine Agenda, Heute im Verein, tenant-wide Offene Anmeldungen, legacy Schnellaktionen, primary News/Aktivitäten) instead of the approved personal command center from PR **#706**.

## USER_VISIBLE_SYMPTOMS

- Legacy greeting/banner and KPI strip
- Meine Agenda / Meine Aufgaben in legacy layout
- Heute im Verein as primary content
- Club-wide **Offene Anmeldungen** (e.g. 149) and **Benötigt Aufmerksamkeit** without personal assignment
- Creation-only **Schnellaktionen**
- News and activity feed dominating the fold

## ROOT_CAUSE

**Primary:** **A — FEATURE NEVER MERGED** + **C — BRANCH BASE ERROR**

- PR **#706** (`cursor/dashboard-d-personal-workspace-discovery`) remains **OPEN**; commits **D / 01–07R1E** were never on `origin/STAGE`.
- PR **#707** was cut from STAGE at `a49190300247ca766160ab402c8b6dc96596b4be`, which predates all dashboard programme work.
- The single planning commit on #707 (`cf4fc108`) added **PersonalDashboard i18n strings** but did **not** change `ClubDashboardView` or loaders — runtime continued to call `getCommandCenterData` / legacy widgets.

**Not involved:** revert on STAGE, routing misconfiguration alone, or #707 overwriting merged dashboard code.

## GIT_FORENSICS

| Checkpoint | SHA | In STAGE | In #706 | In #707 (pre-fix) |
|------------|-----|----------|---------|-------------------|
| DASHBOARD-D | `8f592373` | NO | YES | NO |
| DASHBOARD-01 | `8b9af37e` | NO | YES | NO |
| DASHBOARD-02 | `1563c7bf` | NO | YES | NO |
| DASHBOARD-03 | `38a7adc6` | NO | YES | NO |
| DASHBOARD-04 (migration) | `f04beb9f` | NO | YES | NO |
| DASHBOARD-04 (UI/API) | `d1cdaca2` | NO | YES | NO |
| DASHBOARD-05 | `f0611096` | NO | YES | NO |
| DASHBOARD-06 | `008c04df` | NO | YES | NO |
| DASHBOARD-07R1E | `73d66e52` | NO | YES | NO |

- **#706 HEAD (post-incident discovery):** `59efcaf6` — includes additional planning commits not on #707.
- **DASHBOARD-04 state on #706:** **COMPLETE** (schema `20260923210000_dashboard_04_quick_access_preference`, registry, UI, API, tests).
- **REVERT_FOUND:** NO dashboard revert on STAGE (feature was never merged).

## WHY_TESTS_DID_NOT_PREVENT_IT

- Personal dashboard composition tests (`dashboard-06-composition`, `personal-command-center`) exist only on **#706**, not on **#707** baseline.
- #707 preview exercised `/dashboard` against STAGE-era `ClubDashboardView` + `getCommandCenterData`; no CI sentinel on #707 branch asserted absence of `HeuteImVereinWidget` / KPI strip on the active route.

## RESTORATION_STRATEGY

| Field | Value |
|-------|--------|
| **RESTORATION_SOURCE** | `origin/cursor/dashboard-d-personal-workspace-discovery` |
| **RESTORATION_SOURCE_HEAD** | `73d66e52` (dashboard programme tip; excludes #706-only planning commits after 07R1E) |
| **RESTORATION_METHOD** | Cherry-pick `8f592373^..73d66e52` onto #707 (19 commits), preserving `cf4fc108` PLANNING-UX-05R2 |
| **COMMITS_TO_INTEGRATE** | D, 01, 02, 03, 04, 05, 06, 07, 07R1–07R1E (see table above) |
| **EXPECTED_CONFLICT_AREAS** | `messages/*.json` (pre-added PersonalDashboard keys on #707) — resolved keeping integrated personal strings |
| **PLANNING_FILES_AT_RISK** | Planning-editor / match / training / veranstaltungen surfaces touched only by `cf4fc108` — unchanged by cherry-picks |
| **DASHBOARD_FILES_AT_RISK** | `ClubDashboardView.tsx`, `personal-command-center.ts`, new personal UI modules |

## RESTORED_CONTRACTS

- `/dashboard` → `ClubDashboardView` composing **DASHBOARD-06/07R1E** personal command center (`getPersonalCommandCenterData`, `PersonalDashboardWorkspace`, `PersonalQuickAccess`, `PersonalAttention`, `PersonalTasksPreview`, secondary demoted).
- **Mein Programm / Mein Kalender:** single `loadPersonalProgramme()` universe with relationship-driven relevance.
- **Schnellzugriff:** DASHBOARD-04 registry + persistence (see migration note below).
- **Attention:** personal obligations only (`lib/dashboard/personal-attention`); no tenant-wide registration KPI.
- **Tasks:** canonical personal-actions pipeline.

## ZERO_DISCLOSURE

Preserved via existing suites: `personal-context`, `event-zero-disclosure`, `personal-attention` selection, quick-access permission filtering. Club Admin / manage permission does not inject registration counts into attention.

## PLANNING_REGRESSION_PROTECTION

- `cf4fc108` retained at branch base; cherry-picks did not modify planning-editor files.
- **PASS:** `planning-ux-05-operational.test.ts`, `planning-ux-05r2-sfv-wochenplan-regression.test.ts`.

## MIGRATION_STATE

- **Pending D04 migration:** `prisma/migrations/20260923210000_dashboard_04_quick_access_preference/`
- **NOT applied to STAGE** during this incident (STAGE_DB_WRITE=NO).
- **Deployment:** apply migration on STAGE before enabling persisted Schnellzugriff customization; defaults work without persistence until then.

## NEW_REGRESSION_SENTINELS

Existing on restored branch (now on #707):

- `components/admin/dashboard/__tests__/dashboard-06-composition.test.ts`
- `components/admin/dashboard/__tests__/dashboard-ux-01-structure.test.ts` (updated for DASHBOARD-06)
- `lib/dashboard/__tests__/personal-command-center.test.ts`

## RESIDUAL_RISKS

- STAGE DB lacks D04 preference table until migration deploy — customize API may fail soft; document in ops runbook.
- #706 and #707 diverge on commits after `73d66e52` on dashboard branch (planning 05R1 on #706 only) — reconcile when merging #706 separately.
- Human visual acceptance (DASHBOARD-07R2) still pending on integrated preview.

## PR_STATE

- **#706:** remains OPEN / unmerged (source of truth for full branch history).
- **#707:** repaired with dashboard cherry-picks; remains DRAFT / unmerged.
