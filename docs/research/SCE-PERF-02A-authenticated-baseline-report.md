# SCE-PERF-02A + SCE-ENV-01B — Authenticated baseline & environment verification

**Repository:** Clipse078/sportclubevo-webapp  
**STAGE SHA (verified):** `9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8`  
**Branch:** `cursor/sce-perf-02a-authenticated-baseline-5dbb`  
**Continuity:** Preserves PR #771 research (`cursor/sce-perf-02-env-audit-158a`); PR #770 contained in STAGE.

---

## Executive summary

- **Deployed STAGE** on `https://fcallschwil.sportclubevo.com` matches `origin/STAGE` @ `9e4748bb`, reports `APP_ENV=STAGE`, Neon pooler **eu-central-1**, fingerprint **`acd3b37682911890`**.
- **Read-only Node benchmarks** (authorized `DATABASE_URL`, Standardplan, no `?plan=` materialization) reproduce PR #771: **`getWeekplannerWeek` warm p50 ≈ 1137 ms / p95 ≈ 1255 ms** (n=30); **Trainings core queries warm p50 ≈ 284 ms / p95 ≈ 288 ms** (n=30).
- **Authenticated browser journeys** (click-to-usable, RSC waterfall, Long Tasks, Michael + restricted role) are **NOT MEASURED** — no `SCE_PERF_AUTH_EMAIL` / `SCE_PERF_AUTH_PASSWORD` (or existing session) in this Cloud Agent environment. Unauthenticated routes correctly **307 → /login**.
- **Minimal diagnostics** added (disabled by default): measurement policy, stage HTTP probe script, Server-Timing header builder, optional Prisma query metrics wrapper, readonly bench script. **Not deployed to Vercel** in this package.

---

## Side-effect inspection (benchmark scope)

| Path | Read-only on STAGE? | Notes |
| --- | --- | --- |
| `/dashboard/planner/week` (default / no `plan=`) | YES | Standardplan; Suspense loads `getWeekplannerWeek` |
| `/dashboard/planner/week?plan=<non-default Wochenplan>` | **NO** | `materializeLinkedWeekplannerPlan` on GET (`planner/week/page.tsx`) — can **INSERT** `WeekplannerPlan` |
| Week prev/next (`week=` param only) | YES | Same Standardplan path |
| Filters (`team`, `facility`, `typ`, …) | YES (client re-filter) | Server week payload unchanged |
| `/dashboard/training` list + filters/pagination | YES | Read queries only; no save/cron |
| Session/series **edit** open | YES (GET forms) | Excluded from load benchmarks unless explicitly side-effect-free GET |

### Write-on-read proposal (separate from instrumentation)

Move non-default plan materialization off the GET render path:

1. **Default navigation** resolves Standardplan only (current behavior when `plan` absent).
2. **Non-default plan selection** returns linked plan metadata; materialize via existing **`POST /api/wochenplan/plans/[planId]/materialize`** (or first explicit edit action) with idempotent server handler.
3. **Benchmark / acceptance** treat GET week with `plan=` as mutating until moved.

**Correctness risks:** race on first select; UX must handle “plan preparing” state. **Regression tests:** extend `plan-materialization.test.ts` + planner route integration for “GET does not create rows”.

---

## Server measurements (subset — not page timings)

**Artifact:** `/opt/cursor/artifacts/sce-perf-02a-server-bench.jsonl`  
**Conditions:** Node 22, Prisma 7.7, pooled Neon STAGE, tenant `fc-allschwil`, week `2026-09-28`, 57 calendar items, n=30 warm (+ week transitions n=60 half prev/half next).

| Label | Cold ms | Warm p50 | Warm p75 | Warm p95 |
| --- | ---: | ---: | ---: | ---: |
| `getWeekplannerWeek` | 2162 | 1137 | 1225 | 1255 |
| Planner plans parallel | — | 94 | 94 | 94 |
| Week prev/next aggregation | — | 1162 | 1233 | 1324 |
| Trainings core queries | 285 | 284 | 285 | 288 |

**vs acceptance targets (warm usable page):** Wochenplan server subset alone **EXCEEDS TARGET** p75 ≤ 800 ms before layout, RSC, and client calendar. Trainings core queries **MEETS TARGET** at current volume (full page unmeasured).

**Latency attribution (confirmed vs hypothesis):**

| Layer | Wochenplan | Trainings |
| --- | --- | --- |
| DB aggregation (`getWeekplannerWeek` / series+allocations) | **Confirmed dominant** (~1.1 s warm) | **Confirmed moderate** (~284 ms warm) |
| Plans list parallel | Confirmed small (~94 ms) | — |
| Auth/RBAC duplication layout+page | Plausible (not timed separately this run) | Same |
| RSC serialization + transfer | **NOT MEASURED** | **NOT MEASURED** |
| Client hydration (calendar / table) | **NOT MEASURED** | **NOT MEASURED** |
| VM→Neon RTT vs Vercel function region | Hypothesis — function region **UNKNOWN** | Same |

Existing **`SCE_PERF_TIMING=1`** instrumentation: `lib/planning-hub/admin-server-timing.ts`, planner/training/weekplanner route marks (no new always-on logging in this PR).

---

## Authenticated measurement tooling (draft)

| Component | Purpose |
| --- | --- |
| `scripts/diagnostics/sce-perf-02-readonly-bench.ts` | Node readonly server bench |
| `scripts/diagnostics/sce-perf-02a-stage-http-probe.ts` | Low-rate authenticated HTTP TTFB (requires confirm + allowlisted host + credentials) |
| `lib/diagnostics/sce-perf-measurement-policy.ts` | Host allowlist, mutating query keys |
| `lib/diagnostics/sce-perf-server-timing-header.ts` | Server-Timing header builder when `SCE_PERF_TIMING=1` |
| `lib/diagnostics/sce-perf-query-metrics.ts` | Optional Prisma query count/duration for scripts |

**Operator run (after deploy or locally with credentials — not executed here):**

```bash
export SCE_PERF_MEASUREMENT_CONFIRM=RUN_SCE_PERF_MEASUREMENT
export SCE_PERF_BASE_URL=https://fcallschwil.sportclubevo.com
export SCE_PERF_AUTH_EMAIL='…'
export SCE_PERF_AUTH_PASSWORD='…'
npm run diag:sce-perf-02a-stage-probe
```

Browser Playwright journeys (30+ warm samples, mobile profile, Long Tasks) remain a **follow-up** once credentials + optional `SCE_PERF_TIMING=1` STAGE canary exist.

---

## Environment verification (SCE-ENV-01B)

See **`docs/research/SCE-ENV-01-environment-matrix.md`**.

**Newly re-verified this run:**

- Canonical domain **STAGE** identity (SHA, APP_ENV, DB host/fingerprint).
- Acceptance **Vercel Authentication** wall (302/401 text on public diag).
- Authorized local DB fingerprint **matches** STAGE diag (not PROD).

**PR #563 (DEV-PLATFORM-01) — reusable for ENV, not merged on STAGE:**

- `deployment-identity.ts`, deployment preflight, `.vercelignore` anti-contamination, protected auth guard — **align with E1/E2**; partial overlap with current `resolveDeploymentIdentity` on STAGE tip; merge review still recommended before PROD cutover.

---

## Ranked optimization backlog

1. **Wochenplan B1:** Profile and reduce `getWeekplannerWeek` DB round trips (`lib/weekplanner/queries.ts` + loaders).  
2. **Wochenplan B2:** Remove write-on-read materialization from GET (see proposal above).  
3. **Measure A1:** Deploy `SCE_PERF_TIMING=1` canary + authenticated browser/RSC traces.  
4. **Trainings C1:** DB-level pagination for series/allocation (`training/page.tsx`).  
5. **Client D1:** `dynamic()` split planning calendar chunks.  
6. **Env E1/E2:** Resolve Preview policy conflict; verify/provision true PROD project + DB.

---

## First implementation specs

### Wochenplan first fix (B1)

| Field | Detail |
| --- | --- |
| Measured problem | Warm `getWeekplannerWeek` p50 ~1137 ms (n=30) |
| Source | `lib/weekplanner/queries.ts`, training/match/tournament loaders |
| Proposed change | EXPLAIN on disposable clone; batch allocation fetches; index review |
| Risks | Incorrect batching breaks override/conflict semantics |
| Benchmark | `npm run diag:sce-perf-02-bench` + post-fix n=30 |
| Regression | Existing `lib/weekplanner/__tests__/*` |

### Trainings first fix (C1)

| Field | Detail |
| --- | --- |
| Measured problem | Full-tenant load before in-memory pagination (~284 ms today, scales linearly) |
| Source | `app/(admin)/dashboard/training/page.tsx` |
| Proposed change | Paginate/filter at DB |
| Risks | Filter KPI counts vs page scope |
| Benchmark | Bench script + authenticated list timing |
| Regression | Training management view tests |

### Environment first fix (E1)

| Field | Detail |
| --- | --- |
| Problem | Manifest forbids Preview STAGE DB; preview runbook requires shared STAGE DB |
| Proposed change | Single written Preview policy (see matrix) |
| Risks | Misconfigured Preview side effects |
| Validation | Env entry review checklist |

---

## Machine-readable final block

```
=== PREFLIGHT ===
AUDIT_SHA: 9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8
DEPLOYED_SHA: 9e4748bbb1eb8daae5ec97c0f8b9a8d6a84932a8
ENVIRONMENT: fcallschwil.sportclubevo.com — APP_ENV=STAGE, Vercel target production, Neon eu-central-1 pooler, fingerprint acd3b37682911890
AUTHENTICATED_ACCESS: MISSING (no SCE_PERF_AUTH_* / session in agent env; acceptance behind Vercel auth)
RESULT: Server readonly bench COMPLETE; browser BLOCKED

=== WOCHENPLAN ===
SAMPLE_COUNTS: server warm n=30; week transitions n=60; browser n=0
COLD_RESULTS: getWeekplannerWeek 2162ms (Node)
WARM_P50_P75_P95: 1137 / 1225 / 1255 ms (getWeekplannerWeek only)
WEEK_FILTER_TRANSITIONS: prev/next aggregation p50 1162ms p95 1324ms (server only)
LATENCY_BREAKDOWN: DB aggregation confirmed dominant; RSC/client NOT MEASURED
EXCLUDED_MUTATING_PATHS: non-default ?plan= materializeLinkedWeekplannerPlan
TARGET_STATUS: usable page NOT MEASURED; server subset EXCEEDS TARGET p75 800ms

=== TRAININGS ===
SAMPLE_COUNTS: server warm n=30; browser n=0
COLD_RESULTS: core queries 285ms
WARM_P50_P75_P95: 284 / 285 / 288 ms (core queries only)
FILTER_VIEW_TRANSITIONS: NOT MEASURED (browser)
LATENCY_BREAKDOWN: DB load confirmed; full page NOT MEASURED
TARGET_STATUS: NOT MEASURED (page); core query subset MEETS TARGET at current volume

=== ENVIRONMENTS ===
STAGE_VERIFIED: SHA, APP_ENV, domain diag, DB host/fingerprint
PROD_VERIFIED: UNKNOWN (no APP_ENV=prod deployment observed)
DOMAIN_MAPPING: fcallschwil.sportclubevo.com → STAGE (CONFLICT with prod matrix label)
DATA_SECRET_STORAGE_ISOLATION: STAGE fingerprint verified; PROD distinct UNKNOWN
PREVIEW_POLICY: CONFLICT documented; proposed dual-mode policy in matrix
JOBS_AND_PROVIDERS: vercel.json crons DOCUMENTED; side effects when CRON_SECRET+providers configured
UNKNOWNS: Vercel project IDs, function region, true PROD Neon fingerprint, stage-webapp.fcallschwil.ch DNS

=== INSTRUMENTATION ===
CHANGES: lib/diagnostics/*, scripts/diagnostics/*, npm scripts, unit tests
VALIDATION: vitest lib/diagnostics/__tests__ (7 tests pass); readonly bench executed
PR: cursor/sce-perf-02a-authenticated-baseline-5dbb (draft)
DEPLOYED: NO
LIMITATIONS: Browser/usability/RSC require auth credentials + optional STAGE SCE_PERF_TIMING deploy

=== NEXT_IMPLEMENTATION ===
WOCHENPLAN_FIRST_FIX: B1 profile+reduce getWeekplannerWeek (+ B2 write-on-read)
TRAININGS_FIRST_FIX: C1 DB pagination
ENVIRONMENT_FIRST_FIX: E1 Preview policy + E2 PROD project verification
DEPENDENCIES: Operator auth for browser baseline; optional PR #563 merge for env hardening

=== VERDICT ===
BROWSER_MEASUREMENT: BLOCKED
ENVIRONMENT_AUDIT: PARTIAL (STAGE verified; PROD/Preview policy conflict documented)
REMOTE_DB_WRITES: NONE
REMOTE_CONFIG_CHANGES: NONE
ARTIFACT_PATHS: /opt/cursor/artifacts/sce-perf-02a-server-bench.jsonl; docs/research/SCE-PERF-02A-authenticated-baseline-report.md; docs/research/SCE-ENV-01-environment-matrix.md
NEXT_ACTION: Supply SCE_PERF_AUTH_* for stage probe + Playwright journeys; enable SCE_PERF_TIMING on STAGE canary; implement B1/B2
```
