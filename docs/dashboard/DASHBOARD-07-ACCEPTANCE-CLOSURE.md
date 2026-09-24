# DASHBOARD-07 — Final Acceptance & Programme Closure

**Branch:** `cursor/dashboard-d-personal-workspace-discovery`  
**Closure HEAD:** (see PR #706 after DASHBOARD-07 commit)  
**Base:** `STAGE` @ `a49190300247ca766160ab402c8b6dc96596b4be`  
**Product contract:** *Dashboard = Mein Verein aus meiner Perspektive.*

---

## Accepted phases (D → 07)

| Phase | Scope | Status |
|-------|--------|--------|
| DASHBOARD-D | Discovery, specs, contract map | Accepted |
| DASHBOARD-01 | PersonalContext, relevance, labels, event zero disclosure | Accepted |
| DASHBOARD-02 | Canonical `loadPersonalProgramme()` | Accepted |
| DASHBOARD-03 | Mein Kalender, `MonthActivityGrid`, tenant-local days | Accepted |
| DASHBOARD-04 | Schnellzugriff registry + preference API | Accepted |
| DASHBOARD-04A | STAGE migration deployed once (verified read-only) | Accepted |
| DASHBOARD-05 | Personal attention + task preview | Accepted |
| DASHBOARD-06 | Personal command-center composition | Accepted |
| DASHBOARD-07 | Security matrix, closure gates, i18n residual, docs | Accepted |

**Automated programme status (historical):** DASHBOARD-07 automated acceptance **PASS** at `f2431d236f9f250678cd6cee36c789fb7d2a0c8c`.

**Current status:** **REOPENED → DASHBOARD-07R1 → DASHBOARD-07R1A → DASHBOARD-07R1B → DASHBOARD-07R1C → DASHBOARD-07R1D** (canonical `TrainingSession` in personal programme/calendar). **Not closed.** **Mobile-D blocked** until DASHBOARD-07R2 final human acceptance.

See `docs/dashboard/DASHBOARD-07R1-VISUAL-ACCEPTANCE-REMEDIATION.md`, `docs/dashboard/DASHBOARD-07R1B-PERSONAL-CALENDAR-RELEVANCE.md`, `docs/dashboard/DASHBOARD-07R1C-STAGE-PERSONAL-CALENDAR-FORENSICS.md`, `docs/dashboard/DASHBOARD-07R1D-PERSONAL-TRAININGS.md`.

---

## Final runtime map

| Layer | Entry |
|-------|--------|
| Route | `app/(admin)/dashboard/page.tsx` → `ClubDashboardView` |
| Loader | `getPersonalCommandCenterData()` in `lib/dashboard/personal-command-center.ts` |
| Personal context | Inside `loadPersonalProgramme` / quick-access / attention via canonical services |
| Programme | `loadPersonalProgramme()` (`lib/personal-agenda/load-personal-programme.ts`) |
| Calendar | Same programme items + `resolvePersonalProgrammeMonthGridRange` / `MonthActivityGrid` in `PersonalDashboardWorkspace` |
| Quick access | `resolvePersonalQuickAccess()` + `app/api/dashboard/quick-access/route.ts` |
| Attention / tasks | `loadDashboardPersonalWork()` → personal-actions contracts |
| Secondary | `loadSecondarySnapshotSafe()` (news + structured activity facts) |
| Parallel club dashboard | `getCommandCenterData()` in `lib/dashboard/command-center.ts` **not imported** by `/dashboard` |

### UI composition order

1. `PersonalIdentityHeader` (single `h1` via integrated greeting; DASHBOARD-07R1)
2. `PersonalQuickAccess`
3. `PersonalDashboardWorkspace` (Mein Programm + Mein Kalender, 7/5 grid at `lg`)
4. Benötigt meine Aufmerksamkeit — `PersonalAttention`
5. Meine Aufgaben — `PersonalTasksPreview`
6. Secondary — `PersonalDashboardSecondary` (collapsible)

**Absent from primary:** KPI strip, Heute im Verein, legacy Schnellaktionen, large hero, tenant-wide attention feed.

---

## Security & zero disclosure

Matrix enforced via unit/sentinel suites (no hidden metadata via counts/dots/empty states):

| Case | Suite |
|------|--------|
| A–G Event/programme | `lib/personal-agenda/__tests__/event-zero-disclosure.test.ts`, `personal-programme.test.ts` |
| H Quick access pins | `lib/dashboard/quick-access/__tests__/persistence-security.test.ts` |
| I Tasks | `lib/dashboard/__tests__/personal-tasks-loader.test.ts`, `lib/personal-actions/__tests__/` |
| J Participation | `lib/personal-actions/__tests__/aufgaben-05-participation-actions.test.ts` |

**Result:** PASS (197 focused dashboard tests, 0 new failures in DASHBOARD-07 run).

---

## Multi-tenant

No FCA-specific logic in dashboard runtime loaders (`lib/dashboard/personal-command-center.ts`, personal-agenda loaders). FC Allschwil used only as reference tenant in docs/fixtures.

Isolation: tenantId + userId on all personal queries; cross-tenant denial covered in personal-context and quick-access security tests.

---

## DASHBOARD-04A migration (read-only verification)

Script: `npx tsx scripts/dashboard-04a-stage-migration-verify-readonly.ts`

| Field | Expected | Verified |
|-------|----------|----------|
| Host fragment | `ep-wispy-hall-aso93dy6` | Yes |
| Database | `neondb` | Yes |
| Fingerprint | `acd3b37682911890` | Yes |
| Migration | `20260923210000_dashboard_04_quick_access_preference` | Applied exactly once |
| Checksum | `388b348864d023c5eaabf33ac80a9a79c87303fffbdae1995f483163ceaa9ca4` | Match |
| Finished at | `2026-09-23T21:31:46.312Z` | Match |
| Table | `UserDashboardQuickAccessPreference` | Exists |
| Constraint | `tenantId_userId` unique | Present |
| Pending dashboard migrations | — | None |
| STAGE write in DASHBOARD-07 | — | **No** |

Missing preference row → product defaults (`loadStoredQuickAccessPinnedKeys`); never an error.

---

## Legacy cleanup classification

| Artifact | Classification |
|----------|----------------|
| `DashboardHeroSection` | RETAIN_SHARED (tests / exports; not on `/dashboard`) |
| `DashboardMetricStrip` | RETAIN_SHARED |
| `HeuteImVereinWidget` | RETAIN_SHARED |
| `DashboardQuickActionStrip` | RETAIN_SHARED |
| `DashboardOperationalGrid` | RETAIN_SHARED |
| `getCommandCenterData` / `buildAttentionItems` | RETAIN_NONRUNTIME (legacy club loader; unused by `/dashboard`) |
| Club-first wiring in `ClubDashboardView` | REMOVED (DASHBOARD-06/07) |

---

## i18n closure (DASHBOARD-06 residual)

**Issue:** Secondary activity subtitles were server-built German strings in `loadSecondarySnapshot`.

**Fix (DASHBOARD-07):** Server returns structured facts (`lib/dashboard/secondary-activity-facts.ts`); localized presentation in `ClubDashboardView` via `formatSecondaryActivityPresentation` and `PersonalDashboard.secondary.*` keys in `de`, `en`, `fr`, `it`.

**Result:** PASS — no reusable hardcoded DE/EN/FR/IT product strings in the secondary loader.

---

## Accessibility & responsive (code-level)

- One logical `h1` (`DashboardCompactWelcome`); section `h2` in programme, calendar, secondary.
- Landmarks: personal command center test id; calendar grid ARIA from DASHBOARD-03 tests.
- Quick access customizer: keyboard move up/down (DASHBOARD-04 tests).
- Urgency: textual semantics in `PersonalAttention` (DASHBOARD-05).
- Responsive: `lg:col-span-7` / `lg:col-span-5`; single column below `lg` (DASHBOARD-06 composition tests).

---

## Performance / query architecture

Top-level `/dashboard` loader: **one** RSC data function with `Promise.all` of three bounded domains:

1. `loadPersonalProgramme` (merged feed + month range, single canonical query path)
2. `loadDashboardPersonalWork` (bounded attention + task preview)
3. `loadSecondarySnapshotSafe` (small `take: 2` snapshots)

**Removed from dashboard path:** ~17-query `getCommandCenterData`, daily per-team calendar fetches, duplicate programme datasets, tenant-wide attention aggregation.

---

## Failure isolation

| Tier | Behavior |
|------|----------|
| Critical (context, programme auth, quick access, attention/tasks) | Fail hard — route error acceptable |
| Secondary (news, recent activity) | `loadSecondarySnapshotSafe` logs and returns empty arrays |

---

## Static gates (DASHBOARD-07)

| Gate | Result |
|------|--------|
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc -p tsconfig.build.json --noEmit` | PASS |
| ESLint (changed TS) | PASS |
| `APPLY_DATABASE_MIGRATIONS=false npm run build` | PASS |

---

## Mobile handoff (not MOBILE-D)

Reusable contracts for Mobile Specification v0.4:

- `PersonalContext`, relevance matrix, context labels
- `PersonalProgramme` / `PersonalProgrammeItem`, tenant-local dates, deep links
- `personal-actions` attention/task semantics and zero disclosure
- **Not** portable as-is: Schnellzugriff web UX / DB pins as native nav model

---

## Known non-blocking residuals

- PostgreSQL SSL mode alias warning in Node pg driver (unrelated to dashboard).
- `getCommandCenterData()` retained for potential non-dashboard reuse — not executed on `/dashboard`.
- User-led visual polish across viewports remains product QA outside this engineering closure.

---

## DASHBOARD-07 test entrypoints

- `lib/dashboard/__tests__/dashboard-07-acceptance.test.ts`
- `lib/dashboard/__tests__/secondary-activity-presentation.test.ts`
- Phase suites listed in implementation plan (01–06)
