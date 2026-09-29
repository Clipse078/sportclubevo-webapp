# SCE-PERF-02 + SCE-ENV-01 — Wochenplan / Trainings performance & environment audit

**Repository:** Clipse078/sportclubevo-webapp  
**Audit SHA:** `9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8`  
**Canonical STAGE SHA (verified):** `9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8`  
**PR #770 contained in origin/STAGE:** YES (merge commit equals audit SHA tip)  
**Package scope:** research / read-only measurement / local artifacts only  

---

## Executive summary

Product **Wochenplan** in Planung maps to the **Wochenplaner** at `/dashboard/planner/week`, not the legacy publication board at `/dashboard/wochenplan` (`wochenplan.manage`). Warm server-side aggregation for a representative FCA week (`getWeekplannerWeek`, Standardplan) measured **p50 ≈ 1.13 s / p95 ≈ 1.25 s** (30 samples, Node → Neon pooler, eu-central-1). That alone exceeds the proposed **p75 ≤ 800 ms** usable-content gate before layout auth, shell, RSC serialization, and client calendar work.

**Trainings** (`/dashboard/training`) warm core queries are **p50 ≈ 283 ms** but the page loads **all** series and **all** tenant allocations on every navigation, then paginates in memory — a scaling risk, not yet a gate failure at current FCA volume.

**Environment:** Public `/api/health/diag` on `https://fcallschwil.sportclubevo.com` reports **`appEnvironment: STAGE`**, branch **`STAGE`**, DB fingerprint **`acd3b37682911890`** (matches documented STAGE Neon). Vercel **`vercelEnvironment: production`** is the STAGE project’s Production target, not `APP_ENV=prod`. Documented PROD project values exist; a separately verified `APP_ENV=prod` deployment was **not** observed in this run.

**Runtime browser/RSC timings:** **not measured** (no authenticated session / deployment protection). **Do not treat this audit as a performance PASS.**

---

## 1. Preflight

| Check | Result |
| --- | --- |
| Local branch | Fast-forwarded to `origin/STAGE` @ `9e4748bb` |
| Intervening commits since prior local tip | PR #770 selector archived-roles fix + tests |
| PR #770 | MERGED; contained in STAGE |
| DATA-HYGIENE-02 cleanup | Not executed |
| Remote config / DB writes | None |

### Access limitations

- No login credentials; `acceptance.sportclubevo.com` health diag behind Vercel Authentication.
- `stage-webapp.fcallschwil.ch` did not resolve from the audit VM; `sportclubevo-webapp-stage.vercel.app` returned DEPLOYMENT_NOT_FOUND.
- Authorized **read-only** Node benchmarks against configured `DATABASE_URL` (fingerprint matches STAGE).
- No authenticated Playwright / RSC waterfall / Long Task capture.

---

## 2. Priority journeys — actual routes

### P0 Wochenplan (Wochenplaner)

| Journey | Route / mechanism |
| --- | --- |
| Planung default | `/dashboard/planner` → redirect `/dashboard/planner/week` |
| Primary surface | `/dashboard/planner/week?week=&plan=&ansicht=&typ=&team=&facility=&…` |
| Week prev/next | Same route; `week=YYYY-MM-DD` (Monday ISO week param via `resolveTrainingWeekWindow`) |
| Views | `ansicht=kalender` (default) · `ressourcen` · `liste`; daypart `zeit=` (client URL sync, PLANNING-HUB-02E) |
| Open event | Client navigation via `getPlanningHubItemHref` → training session edit, matchcenter, tournamentcenter, veranstaltungen |
| Legacy publication Wochenplan | `/dashboard/wochenplan` (separate module, `WOCHENPLAN_MANAGE`) |

**Server render pipeline (week page):**

1. `(admin)/layout.tsx` — `auth()`, `getActiveTenant()`, person profile, participation nav capability  
2. `planner/week/page.tsx` — `requireAnyPermission`, tenant, **parallel** `listWochenplanPlans` + `listWeekplannerPlans`, optional **`materializeLinkedWeekplannerPlan` (WRITES)** when non-default `plan=`  
3. `PlannerWeekDataSection` (Suspense) — **`getWeekplannerWeek`**, facilities, dressing presets, optional plan allocation overrides  

### P0 Trainings

| Journey | Route |
| --- | --- |
| Hub | `/dashboard/training` |
| Legacy planungsraster tab | Redirect to Wochenplaner resources URL |
| Series management | Default view; filters via query (`seriesSearch`, `seriesTeam`, `seriesStatus`, `archived`, `page`) |
| Session edit | `/dashboard/training/sessions/[sessionId]/edit` |
| Series edit / allocations | `/dashboard/training/series/[seriesId]/edit`, `.../allocations` |

**Server pipeline:** `requireAnyPermission` → parallel **`listTrainingSeries(includeArchived: true)`**, **`listAllocationsGroupedBySeries`** (full tenant), team filter options → in-memory filter/sort/paginate → `TrainingManagementWorkspace`.

---

## 3. Confirmed bottlenecks (code + partial measurement)

### Wochenplaner

1. **`getWeekplannerWeek` dominates server time** — parallel fan-out: facility code map, plan overrides, time overrides, baseline mode, policies, then parallel training / match / tournament / veranstaltung loaders, then `buildWeekplannerWeek` conflict pass (`lib/weekplanner/queries.ts`, `view-model.ts`).  
   **Measured:** 30 warm samples, Standardplan, FCA tenant `fc-allschwil`, week `2026-09-28`, **57 items** — see artifact `sce-perf-02-server-bench.jsonl`.

2. **Double server tree work per navigation** — chrome route loads plans (~94 ms warm) **plus** Suspense block loads full week (~1.1 s warm). Skeleton can show while week runs (PLANNING-HUB-03D2) but **usable schedule waits on Suspense**.

3. **Read path can write** — selecting a non-default Wochenplan variant triggers `materializeLinkedWeekplannerPlan` during GET (`planner/week/page.tsx`). First hit creates `WeekplannerPlan` rows. Exclude from read-only benchmarking; adds latency and violates strict read-only semantics.

4. **Repeated auth/RBAC** — layout calls `auth()`; page calls `requireAnyPermission` → `auth()` again + `getRequestEffectivePermissions` (request-cached, but auth session resolution still duplicated). See `app/(admin)/layout.tsx`, `lib/permissions/require-any-permission.ts`.

5. **Heavy client bundle path** — `PlanningHubCalendarView`, manipulation, conflict inspection load with week payload; no `dynamic()` splits found under `components/admin/planning-hub`. Client-side filters (`lib/planning-hub/filters.ts`) re-process full week on filter changes (cheap vs server fetch).

6. **SCE-PERF-01 optimizations present but insufficient** — `react` `cache()` dedupes facilities/policies/RBAC per request (`lib/server/request-cache.ts`, `request-effective-permissions.ts`); optional `SCE_PERF_TIMING` server timers (`lib/planning-hub/admin-server-timing.ts`); Planning nav uses `next/link` (test-enforced). **Gap:** no cross-request cache for week aggregation; no DB-level pagination for week sources.

### Trainings

1. **Full-tenant series + allocation load every navigation** (`training/page.tsx`) — pagination is server-side only after materializing all rows.

2. **Team display name query** after series load (`listTeamSeasonDisplayNamesForManagement`) — extra round trip proportional to distinct team seasons on page.

3. **Warm core queries ~283 ms p95** — acceptable at current size; will degrade linearly with series/allocation growth.

### Shared shell

- Admin layout always resolves tenant + person + participation capability.  
- No root `middleware.ts` in repo; gating is layout + per-page permission helpers.

---

## 4. Runtime measurements

### Conditions (server-only subset)

| Field | Value |
| --- | --- |
| Samples | 30 warm + 1 cold per benchmark |
| Tenant | `fc-allschwil` (`cmomwboak0000tsf3zzivrs46`) |
| Week | `2026-09-28` |
| Plan | Standardplan (`planId` undefined) |
| DB | Neon pooler `ep-wispy-hall-aso93dy6` … `eu-central-1`, fingerprint `acd3b37682911890` |
| Client | Node 22 + Prisma 7.7 (not browser, not Vercel function) |

### Results (milliseconds)

| Label | Cold | Warm p50 | Warm p75 | Warm p95 |
| --- | ---: | ---: | ---: | ---: |
| `getWeekplannerWeek` | 2241 | 1132 | 1139 | 1250 |
| Planner plans parallel | — | 94 | 94 | 96 |
| Training core queries | 288 | 283 | 283 | 285 |

### Not measured (requires follow-up)

- Click-to-visible / click-to-usable in Chrome (desktop + mobile)  
- Full RSC request count and payload sizes on `/dashboard/planner/week`  
- Vercel function cold starts vs warm  
- Restricted-role comparison (Michael vs trainer)  
- Week transition, filter, event drill-in return paths in browser  
- Connection pool wait on Vercel  

### Minimal instrumentation proposal (do not deploy in this package)

1. Enable **`SCE_PERF_TIMING=1`** on STAGE for one canary deployment; correlate `[sce-perf:planner/week]` and `[sce-perf:weekplanner/data]` logs with Vercel request IDs.  
2. Add **`Server-Timing`** response headers wrapping existing admin timers (browser DevTools waterfall).  
3. Scoped **`prisma.$extends` query counter** gated by `SCE_PERF_TIMING`, logging counts only (no SQL params).  
4. Authenticated synthetic journey script (Playwright) recording `navigation` timing + Performance API long tasks — run against acceptance with operator credentials, low rate.

Script used: `scripts/diagnostics/sce-perf-02-readonly-bench.ts`  
Artifact: `/opt/cursor/artifacts/sce-perf-02-server-bench.jsonl`

---

## 5. Hosting / database

| Topic | Finding | Class |
| --- | --- | --- |
| Region | Neon + pooler in **eu-central-1** (from public diag) | VERIFIED (STAGE) |
| Pooling | `-pooler` host on `DATABASE_URL` | VERIFIED |
| App vs DB distance | Audit VM → Neon adds RTT; explains part of ~1 s week query | HYPOTHESIS (magnitude needs Vercel-region comparison) |
| Compute suspension | Not observable from repo | UNKNOWN |
| Slow query logs | Not accessed | UNKNOWN |

Repository defaults: Prisma + `@prisma/adapter-pg` pool in `lib/db/prisma.ts`. Deployed sizing: **DOCUMENTED ONLY** in Vercel/Neon consoles.

---

## 6. Environment matrix (names/scopes only)

See **`docs/research/SCE-ENV-01-environment-matrix.md`**.

**Key finding:** Canonical customer domain **`fcallschwil.sportclubevo.com`** currently serves **`APP_ENV=stage`** data (STAGE fingerprint). Treat as **STAGE operational environment on Vercel Production target**, not isolated PROD.

**Policy conflicts:**

| Source | Statement |
| --- | --- |
| `environment-manifest.md` Preview section | Preview must **not** receive shared STAGE `DATABASE_URL` / secrets |
| `stage-preview-migration-runbook.md` | PR Preview for `sportclubevo-webapp-stage` **intentionally uses shared STAGE database** |
| `environment-manifest.md` billing | Preview may copy `SCE_BILLING_ENCRYPTION_KEY` when Preview uses persistent STAGE DB for billing acceptance |

**Recommendation:** Adopt a single written policy: either (A) **credential-poor Preview + no STAGE data** (manifest-aligned), or (B) **explicit labeled “STAGE-data Preview”** with allowlisted secrets, encryption key parity, and no cron/email side effects — never both ambiguously.

**Scheduled jobs on STAGE:** Cron routes require `CRON_SECRET` + `isExternalSideEffectConfigured("cron", …)` (`lib/server/external-side-effect-policy.ts`). On STAGE (non-acceptance), configured credentials enable real side effects unless provider-specific guards block — **DOCUMENTED ONLY** for individual crons; verify each route’s env guards before enabling on shared STAGE.

---

## 7. Open PR dependencies (performance / env relevance)

| PR | Title | vs STAGE @ 9e4748bb | Recommendation |
| --- | --- | --- | --- |
| #636 TRAININGS-UX-03 | Session record workspace | Outstanding (base feature branch) | Merge after perf gates; may add session workspace weight |
| #637 DASHBOARD-UX-01 | Personal cockpit | Outstanding | Shell work — review dashboard data fan-out before merge |
| #563 DEV-PLATFORM-01 | Deterministic deployments / auth | Outstanding | **Relevant to ENV-01** — prioritize review before PROD cutover |
| #508 TEAM-IDENTITY-02 | Wochenplan identity guard | Outstanding | Planning-adjacent; low perf risk |
| #503 TEAM-CHANNEL-PUBLICATION | Publication foundation | Outstanding | Indirect (feeds/public surfaces) |
| Communication EVO #753–760 | Comms rebuild | Outstanding | Unrelated to Wochenplan/Trainings hot paths |

No open PR identified as a merged perf fix superseding SCE-PERF-01 work on STAGE.

---

## 8. Prioritized implementation plan

### A. Measurement / instrumentation (first)

| # | Problem | Change | Benefit | Risk |
| --- | --- | --- | --- | --- |
| A1 | No browser baseline | Playwright + Performance API on acceptance | Measured p75/p95 vs gates | Credential handling |
| A2 | Server timers not in prod logs | STAGE canary `SCE_PERF_TIMING=1` + log drain | Measured segment times | Log volume |
| A3 | No query counts | Opt-in Prisma query counter | Confirmed DB bottleneck | Must not log params |

### B. Server / database — Wochenplaner (priority)

| # | Problem | Files | Change | Expected benefit |
| --- | --- | --- | --- | --- |
| B1 | ~1 s `getWeekplannerWeek` | `lib/weekplanner/queries.ts`, related services | EXPLAIN ANALYZE on disposable clone; reduce round trips (batch training allocations, tighten match/tournament selects); index review on `TrainingSession.date`, `Event.startAt` | **Estimated** 30–50% server time reduction |
| B2 | Read GET writes on plan select | `planner/week/page.tsx`, `plan-materialization.ts` | Lazy materialize on first edit or explicit POST | Removes write + lock contention on navigation |
| B3 | Plans + week sequential phases | `planner/week/page.tsx` | Start Suspense earlier with week param only; defer plan list to parallel child if chrome allows | **Estimated** improved time-to-first-byte for chrome |
| B4 | Override map loads all allocations | `PlannerWeekDataSection.buildOverridesByKey` | Load overrides when inspector opens, not initial week | **Estimated** save 1 query + payload on default view |

**First recommended fix (Wochenplan):** **B1 + A1** — profile `getWeekplannerWeek` with query plans and authenticated RSC timing before caching.

### C. Server — Trainings

| # | Problem | Change | Benefit |
| --- | --- | --- | --- |
| C1 | Full tenant series/allocation load | DB-level pagination + filtered allocations for current page team seasons | **Estimated** stable sub-500 ms as series count grows |

**First recommended fix (Trainings):** **C1** (paginate at source).

### D. Client / navigation

| # | Change | Benefit |
| --- | --- | --- |
| D1 | `dynamic()` import calendar/manipulation chunks | Smaller initial JS, faster hydration |
| D2 | Share session between layout and pages via cached `auth()` wrapper | **Estimated** small server win |

### E. Environment isolation

| # | Change |
| --- | --- |
| E1 | Resolve manifest vs preview-runbook conflict (document single Preview policy) |
| E2 | Verify/provision **`fc-allschwil-webapp-prod`** with **`APP_ENV=prod`**, distinct DB fingerprint, distinct secrets |
| E3 | Until E2, label `fcallschwil.sportclubevo.com` as STAGE in operator runbooks (avoid “PROD” language) |

### F. Production readiness gates

- Do **not** copy STAGE DB/registrations into PROD.  
- Sandra/Scotty onboarding remains blocked until browser perf gates pass and PROD isolation verified.

### Acceptance targets (from package — targets only)

| Metric | Target |
| --- | --- |
| Interaction acknowledgement | p95 ≤ 100 ms |
| Warm Wochenplan/Trainings usable content | p75 ≤ 800 ms, p95 ≤ 1.5 s |
| Warm week/filter transitions | p95 ≤ 1 s |
| Selector initial/search | p95 ≤ 800 ms |

Current evidence: **Wochenplan server-only warm p50 already ~1.13 s** → **FAIL** vs p75 800 ms without counting RSC/client.

---

## 9. Official sources (compatibility notes)

- Next.js Server Components & `cache()` — https://nextjs.org/docs/app/building-your-application/rendering/server-components  
- Next.js `loading.js` / Suspense — https://nextjs.org/docs/app/api-reference/file-conventions/loading  
- Vercel Environment Variables (`VERCEL_ENV` vs custom) — https://vercel.com/docs/projects/environment-variables  
- Neon connection pooling — https://neon.tech/docs/connect/connection-pooling  
- Prisma query optimization — https://www.prisma.io/docs/orm/prisma-client/queries/query-optimization-performance  
- Web Vitals / Long Tasks — https://web.dev/articles/user-centric-performance-metrics  

Installed: Next (app router), Prisma **7.7.0** (see `package.json` / client version in bench output).

---

## 10. Verdict block (machine-readable summary)

```
=== PREFLIGHT ===
AUDIT_SHA: 9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8
CANONICAL_STAGE_SHA: 9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8
PR_770_CONTAINED: YES
ACCESS_LIMITATIONS: No auth session; STAGE custom domain DNS failure from VM; browser/RSC unmeasured; read-only Node bench vs STAGE DB only

=== WOCHENPLAN ===
ACTUAL_ROUTES: /dashboard/planner/week (Wochenplaner); /dashboard/wochenplan (legacy publication)
MEASURED_BASELINE: getWeekplannerWeek warm p50 1132ms p95 1250ms (n=30, Node→Neon, FCA, week 2026-09-28, 57 items); plans parallel p95 96ms
CONFIRMED_BOTTLENECKS: getWeekplannerWeek aggregation; Suspense-bound usable content; optional plan materialize WRITE on GET; duplicated auth() across layout+page
HYPOTHESES: Vercel↔Neon RTT; large match join graph; client calendar hydration cost (unmeasured)
FIRST_RECOMMENDED_FIX: Profile+reduce getWeekplannerWeek DB round trips (B1) with STAGE SCE_PERF_TIMING + browser RSC measurement (A1)

=== TRAININGS ===
ACTUAL_ROUTES: /dashboard/training (+ sessions/series edit routes)
MEASURED_BASELINE: core queries warm p50 283ms p95 285ms (n=30)
CONFIRMED_BOTTLENECKS: full-tenant series+allocation load before pagination
HYPOTHESES: KPI/filter rerenders add client cost (unmeasured)
FIRST_RECOMMENDED_FIX: DB-level pagination/filter for series list (C1)

=== SHARED_PERFORMANCE ===
AUTH_TENANT_PERMISSIONS: requireAnyPermission + getRequestEffectivePermissions cached per request; auth() likely duplicated layout+page
DATABASE_REGION_POOLING: eu-central-1 Neon pooler; fingerprint acd3b37682911890 on canonical domain diag
REQUEST_AND_RENDER_WATERFALLS: layout → page plans → Suspense week (unmeasured in browser)
SECONDARY_FINDINGS: /api/planning-hub/facility-groups client fetch when ressourcen deferred; zeit= client-only (good)

=== ENVIRONMENTS ===
STAGE: sportclubevo-webapp-stage (documented); fcallschwil.sportclubevo.com serves APP_ENV=STAGE @ 9e4748bb
PROD: fc-allschwil-webapp-prod documented; live APP_ENV=prod deployment NOT verified this run
PREVIEW: policy conflict manifest vs stage-preview runbook (shared STAGE DB)
ISOLATION_VERIFIED: STAGE DB fingerprint matches local authorized URL; PROD isolation NOT verified
POLICY_CONFLICTS: Preview DB sharing vs manifest; billing encryption key exception
SCHEDULED_JOBS_AND_DELIVERY: CRON+provider creds enable side effects on STAGE when configured (non-acceptance bypass)
UNKNOWNS: STAGE custom domain DNS; separate PROD Neon fingerprint; Vercel project IDs for prod project

=== OPEN_PR_DEPENDENCIES ===
RELEVANT_PRS: #563, #636, #637, #508
CONTAINED_OR_OUTSTANDING: all outstanding vs 9e4748bb
RECOMMENDATION: Land DEV-PLATFORM-01 before PROD; defer UX PRs until perf gates measured

=== PLAN ===
ORDERED_PACKAGES: A (instrumentation) → B1/B2 (Wochenplan server) → C1 (Trainings pagination) → D (client split) → E (env isolation)
ACCEPTANCE_GATES: browser-measured p75/p95 per package §9; PROD DB/secrets distinct from STAGE
REPORT_PATHS: docs/research/SCE-PERF-02-SCE-ENV-01-report.md; docs/research/SCE-ENV-01-environment-matrix.md; /opt/cursor/artifacts/sce-perf-02-server-bench.jsonl
OFFICIAL_SOURCES: see §9

=== VERDICT ===
RESEARCH_STATUS: PARTIAL
RUNTIME_MEASUREMENT_STATUS: Server-only subset complete; browser/RSC NOT verified — FAIL vs acceptance gates
REMOTE_DB_WRITES: NONE (benchmark avoided plan materialization)
REMOTE_CONFIG_CHANGES: NONE
NEXT_ACTION: Execute A1+A2 on acceptance/STAGE with auth; implement B1 query profiling on disposable DB clone; resolve E1/E2 policy before onboarding
```
