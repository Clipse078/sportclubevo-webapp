# SCE-COLLAB-01D — Multi-activity impact

## Status

| Field | Value |
|-------|-------|
| Package | **SCE-COLLAB-01D** |
| Status | **IMPLEMENTED / HUMAN_UAT_R1_FAILED / HUMAN_UAT_R1_RETEST_PENDING** |
| Parent SCE-COLLAB-01 | **IN_PROGRESS** (01A/01B/01C closed; 01D not closed until Human UAT) |
| Schema / migration | **NO** |

## Human UAT R1 (2026-10-10) — FAIL

| Finding | Detail |
|---------|--------|
| Save latency | **> 60s** on Vercel preview for FC Allschwil **Senioren 40+ Training** series save (start 18:45 → 19:00) |
| Impact size | **51** atomic training impacts surfaced |
| Historical dates | Impact list included sessions **before** UAT date (e.g. Aug–Oct 7 2026) |
| Root cause (latency) | **01D regression**: per-session COMM-03 PREVIEW (×51) in atomic impact assembly **plus** ×51 union loop in grouped preview; repeated series allocation loads during snapshotting |
| Root cause (history) | **Pre-existing** `generateTrainingSessions()` re-synced **all** SCHEDULED rows in `[validFrom, validUntil]` including calendar-past dates; 01D correctly diffed what was mutated but surfaced the full set |

## Remediation (R1)

| Area | Change |
|------|--------|
| Mutation scope / integrity | Calendar dates **before today** (series timezone) no longer receive template schedule re-sync on series save (historical rows preserved) |
| Batch snapshots | One series allocation load + batched session allocation query + in-memory snapshots |
| COMM-03 | **One** PREVIEW per distinct team audience for grouped training impact (not per session) |
| Impact scope | Atomic net diff only; unchanged sessions excluded (unchanged) |
| Large impact UX | Show **5** activities initially; **Alle N anzeigen** / collapse; audience block **above** activity list |
| Failure isolation | Unchanged — collaboration assembly failure does not fail PUT |

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
- `dispatchStrategy`: `COMBINED` vs `SEPARATE_REQUIRED` (different teams / mixed comm permission → separate)

### Grouping rules (01D)

| Rule | Behavior |
|------|----------|
| Tenant | Never cross tenants |
| Training series PUT | Single team season → same team audience |
| Different teams in one batch | `SEPARATE_REQUIRED` (not combinable) |
| Mixed `canCommunicate` | `SEPARATE_REQUIRED` |
| Recipient union | **One COMM-03 PREVIEW per distinct team audience** for impact banner; publish path unchanged |
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
- `lib/training/__tests__/session-generation-service.test.ts` — historical date boundary (A8b)
- `components/admin/collaboration/__tests__/ContextualMultiActivityChangeImpactSurface.test.tsx` — disclosure UX
- Regression: 01A/01B/01C collaboration suites (run in CI batch)

## Human UAT R1 re-test (safe)

**Do not** re-mutate the Senioren 40+ series until stakeholders confirm historical data handling.

Preferred:

1. Create or use a **future-only** test series (validFrom ≥ today), or
2. Edit a series with only **future** SCHEDULED occurrences.

Acceptance:

1. Save completes in normal interactive time
2. No calendar-past sessions change on template edit
3. Impact lists **only** net-changed future sessions
4. Large list compact + expand/collapse
5. Audience + deduped recipient count visible without scrolling all rows
6. Composer opens; cancel retains impact; real send optional

## Deferred

- Planner multi-select / Wochenplaner bulk DnD grouped impact (reuse 01D domain layer)
- SFV async multi-activity inbox (durable persistence)
- Partial subset dispatch
- Match/tournament multi-activity batches
- Restoring FC Allschwil Senioren 40+ historical start times after UAT (product decision; **no** manual DB patch in 01D)
