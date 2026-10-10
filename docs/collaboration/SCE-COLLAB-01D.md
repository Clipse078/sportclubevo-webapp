# SCE-COLLAB-01D — Multi-activity impact

## Status

| Field | Value |
|-------|-------|
| Package | **SCE-COLLAB-01D** |
| Status | **CLOSED** (PR [#816](https://github.com/Clipse078/sportclubevo-webapp/pull/816) → STAGE; Human UAT R2 **PASS** 2026-10-10) |
| Parent SCE-COLLAB-01 | **CLOSED** (01A–01D delivered; see parent doc) |
| Feature head (implementation) | `60d4377a57812afae9c17c33c2164bb914e9ca85` |
| STAGE merge SHA (PR #816) | `b90a617a7bd7ae28cadc59d776c8263bf3b54b4f` |
| Merged at | 2026-10-10T11:23:41Z |
| Schema / migration | **NO** |
| STAGE baseline at slice start | `e16a6d983601a1cfde9ad9273f2e1036e8007000` |

## Human UAT R1 (2026-10-10) — FAIL → R1 remediation

| Finding | Detail |
|---------|--------|
| Save latency | **> 60s** on Vercel preview for FC Allschwil **Senioren 40+ Training** series save (start 18:45 → 19:00) |
| Impact size | **51** atomic training impacts surfaced |
| Historical dates | Impact list included sessions **before** UAT date (e.g. Aug–Oct 7 2026) |
| Root cause (latency) | **01D regression**: per-session COMM-03 PREVIEW (×51) in atomic impact assembly **plus** ×51 union loop in grouped preview; repeated series allocation loads during snapshotting |
| Root cause (history) | **Pre-existing** `generateTrainingSessions()` re-synced **all** SCHEDULED rows in `[validFrom, validUntil]` including calendar-past dates; 01D correctly diffed what was mutated but surfaced the full set |

### Human UAT after R1 remediation — PASS (impact / save)

| Check | Result |
|-------|--------|
| Training-series Save | Fast |
| Historical protection | **9** past sessions unchanged; **42** future sessions changed (**51** total in series) |
| UI summary | `Training gespeichert — 51 Termine — 42 aktualisiert, 9 unverändert.` |
| Grouped impact | `42 Trainings geändert`; first affected **Wednesday 14 October 2026** |
| Compact list / expand / collapse | PASS |
| Audience + Empfänger count | PASS |

### Human UAT R1 — remaining FAIL (composer)

| Finding | Detail |
|---------|--------|
| Composer open | **Änderung kommunizieren** took tens of seconds before composer usable |
| Generated message | **42** identical date blocks (`Startzeit: 19:00 → 18:45`) — poor recipient UX |

**Classification after R1:** IMPLEMENTED / HUMAN_UAT_R2_REMEDIATION_REQUIRED (composer findings only)

### Human UAT R2 (2026-10-10) — PASS (composer / communication)

| Check | Result |
|-------|--------|
| Composer open (`Änderung kommunizieren`) | Performance **accepted** by Human UAT |
| Generated message | **Semantic recurring-change summary** accepted (no 42 identical date blocks) |
| Redundant per-date communication | **Removed** for uniform schedule change |
| Communication editability | **PASS** — draft remains editable |
| Detailed activity impact | **PASS** — operational list available separately from recipient summary |
| Cancel / reopen lifecycle | **PASS** — unresolved impact retained; draft reuse on reopen |

**Final classification:** **HUMAN_UAT_R2 = PASS** — no additional Human UAT required for 01D.

## Remediation (R1)

| Area | Change |
|------|--------|
| Mutation scope / integrity | Calendar dates **before today** (series timezone) no longer receive template schedule re-sync on series save (historical rows preserved) |
| Batch snapshots | One series allocation load + batched session allocation query + in-memory snapshots |
| COMM-03 | **One** PREVIEW per distinct team audience for grouped training impact (not per session) |
| Impact scope | Atomic net diff only; unchanged sessions excluded |
| Large impact UX | Show **5** activities initially; **Alle N anzeigen** / collapse; audience block **above** activity list |
| Failure isolation | Unchanged — collaboration assembly failure does not fail PUT |

## Remediation (R2) — composer prepare + semantic summary

| Area | Change |
|------|--------|
| Prepare snapshots | Reuse **`loadTrainingSeriesActivitySnapshots`** (one batched load) instead of **N × `loadTrainingActivitySnapshot`** (each re-loaded series allocations) |
| Prepare ordering | Auth + existing draft lookup before heavy snapshot work |
| COMM-03 at prepare | **One** `resolveMultiActivityTrainingDispatchPreview` per prepare (same team audience); not per activity |
| Message model | `MultiActivityCommunicationSummary` with `UNIFORM_RECURRING_CHANGE` / `MIXED_CHANGES` / `SMALL_EXPLICIT_SET` |
| Uniform recurring time | Single German rule message (e.g. Trainingszeit am Mittwoch ab **14. Oktober 2026**; Neu/Bisher full window) |
| Subject | e.g. `Trainingszeit geändert · FC Allschwil Senioren 40+` (not `Änderung: 42 Trainings …`) |
| Body guard | Semantic compression first; line-bounded fallback (`MULTI_ACTIVITY_COMMUNICATION_BODY_MAX_LINES`) |
| Impact UI | **Unchanged** — operational list still shows all affected sessions |

### Root cause (composer slowness)

`prepareMultiTrainingActivityChangeCommunicationDraft` loaded **every** changed session via `loadTrainingActivitySnapshot` in a sequential loop. Each call re-fetched **series-level allocations** and ran separate Prisma reads — **O(N)** redundant DB work for N≈42, dominating wall time before the composer opened.

## Product principle

**CHANGE → IMPACT → AUDIENCE → INFORM**

- **Impact detail** (admin): concrete per-session audit list (42 rows OK).
- **Communication summary** (recipients): semantically compressed when all sessions share one rule.

## Problem

After 01A–01C, contextual collaboration covers **one activity** per unresolved cycle. Real club operations often change **many training occurrences in one save** (training series schedule regeneration). Admins need grouped impact: how many sessions changed, per-session net diffs, audience, deduplicated recipient count, and optional combined communication.

## Architecture diagnosis (repository)

| Question | Answer |
|----------|--------|
| Repository definition before this slice | Docs listed 01D as **FUTURE** only — no prior implementation |
| Meaning | Primarily **(A)** one user operation → many activities → one grouped impact workflow; aggregation composes existing atomic `ActivityChangeImpact` |
| Atomic source of truth | Unchanged single-activity net diff (`baseline → current`) from 01B R2 |
| Batch boundary | Explicit **training series PUT** mutation + `batchOperationId` (UUID per save) |
| No durable DB batch inbox | Transient client state + orchestration meta on PlatformCommunication draft |

## Domain model

- `MultiActivityChangeImpact` — groups `ActivityChangeImpact` items from one batch operation
- `MultiActivityChangeSet` — prepare/publish payload (change sets + `batchFingerprint`)
- `MultiActivityCommunicationSummary` — deterministic communication compression (R2)
- `dispatchStrategy`: `COMBINED` vs `SEPARATE_REQUIRED` (different teams / mixed comm permission → separate)

### Grouping rules (01D)

| Rule | Behavior |
|------|----------|
| Tenant | Never cross tenants |
| Training series PUT | Single team season → same team audience |
| Different teams in one batch | `SEPARATE_REQUIRED` (not combinable) |
| Mixed `canCommunicate` | `SEPARATE_REQUIRED` |
| Recipient union | **One COMM-03 PREVIEW per distinct team audience** for impact banner; **one** at composer prepare for same audience |
| Partial resolution | **Not supported** — successful grouped publish clears whole batch (client state) |
| Cumulative net diff | Per activity before/after series save; full reversion removes activity from group |

## Integration surface (vertical slice)

| Surface | Training series edit (`TrainingSeriesRecordWorkspace`) |
| Mutation | `PUT /api/training-series/[seriesId]` |
| Impact assembly | `buildTrainingSeriesMutationCollaborationImpact` (failure-isolated) |
| Prepare / publish | `POST /api/collaboration/training-series/[seriesId]/prepare-communication` / `publish-communication` |
| UI | `TrainingSeriesCollaborationHost` + `ContextualMultiActivityChangeImpactSurface` |

Activity mutation **never fails** when collaboration assembly fails (`multiActivityCollaboration` omitted).

## Tests

- `lib/collaboration/__tests__/sce-collab-01d-multi-activity-impact.test.ts` — grouping, fingerprint, presentation, union algebra
- `lib/collaboration/__tests__/sce-collab-01d-r1-remediation.test.ts` — COMM-03 dedup, scope, 50+ grouping
- `lib/collaboration/__tests__/sce-collab-01d-r2-remediation.test.ts` — prepare batching, draft reuse, semantic summary
- `lib/training/__tests__/session-generation-service.test.ts` — historical date boundary (A8b); C1 DTO fixture
- `components/admin/collaboration/__tests__/ContextualMultiActivityChangeImpactSurface.test.tsx` — disclosure UX
- Regression: 01A/01B/01C collaboration suites (run in CI batch)

## Human UAT evidence (locked)

| Round | Outcome |
|-------|---------|
| R1 initial | FAIL — save >60s; 51 impacts; historical sessions rewritten in list |
| R1 remediation + re-UAT | PASS — fast save; 51 total / 42 changed / 9 protected; compact impact UX |
| R2 initial | FAIL — slow composer; 42 redundant identical change blocks |
| R2 remediation + re-UAT | **PASS** — fast prepare; semantic summary; editable draft; lifecycle OK |

## Final invariants (closure)

| Invariant | Closure verification |
|-----------|------------------------|
| **Multi-activity model** | One operation → many atomic `ActivityChangeImpact` items; grouping does not replace single-activity semantics |
| **Operation boundary** | Training series PUT → many session changes → **one** grouped collaboration impact |
| **Net impact** | Only changed activities; zero-diff excluded |
| **Historical integrity** | Calendar-past sessions not re-synced on template edit; mutation boundary respected |
| **Audience** | Equivalent team audience resolved once per distinct context |
| **Recipient dedupe** | One COMM-03 PREVIEW per distinct team audience (impact + prepare) |
| **Communication summary** | Recipient-facing compression separate from operational N-row impact detail |
| **Failure isolation** | Collaboration assembly failure does not fail training series PUT |
| **Lifecycle** | Cancel retains impact; send failure retains impact; successful send clears batch client state |
| **Idempotency** | `batchFingerprint` prevents duplicate drafts for same unresolved batch |
| **Security** | Activity edit auth separate from `communication.team.send`; tenant isolation unchanged |

## Known STAGE UAT data (not an open product defect)

During **pre-R1** Human UAT on STAGE, series **Senioren 40+ Training** (`cmsp4t1oa000004jvytoux8ju`) had **9** historical session rows altered by the old regeneration behavior.

| Field | Value |
|-------|-------|
| Classification | **KNOWN_STAGE_UAT_DATA** |
| Open product defect | **NO** — subsequent series mutations are protected |
| Restoration via closure SQL | **NO** — use a supported product path later if desired |

## Closure verification (2026-10-10)

| Gate | Result |
|------|--------|
| Focused 01D + collaboration regression battery | **329/329 PASS** (29 files) |
| Training generation sentinel | **38/38 PASS** |
| ESLint (PR-changed TS/TSX) | **0 new errors** |
| Build | **PASS** — `NODE_OPTIONS=--max-old-space-size=8192 npm run build` |
| Schema / migration / role / permission / COMM-03 semantic change | **NO** |
| PROD | **Untouched** |

**KNOWN_P2 (pre-existing):** `training-series-allocation-propagation.test.ts` — unhandled async rejection noise from dashboard/cache side effects in harness; **not** classified as 01D regression (tests still pass).

## Deferred

- Planner multi-select / Wochenplaner bulk DnD grouped impact (reuse 01D domain layer)
- SFV async multi-activity inbox (durable persistence)
- Partial subset dispatch
- Match/tournament multi-activity batches
- Restoring FC Allschwil Senioren 40+ historical start times after UAT (product decision; **no** manual DB patch in 01D)
