# SCE-COLLAB-01D — Multi-activity impact

## Status

| Field | Value |
|-------|-------|
| Package | **SCE-COLLAB-01D** |
| Status | **IMPLEMENTED / HUMAN_UAT_PENDING** |
| Parent SCE-COLLAB-01 | **IN_PROGRESS** (01A/01B/01C closed; 01D not closed until Human UAT) |
| Schema / migration | **NO** |

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
| Recipient union | COMM-03 preview per session, **union** person ids (deduped) |
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
- Regression: 01A/01B/01C collaboration suites (run in CI batch)

## Human UAT (preview)

1. Open an existing training series with multiple future sessions.
2. Change weekday time(s) and save.
3. Confirm save success message and grouped impact banner (`N Trainings geändert`).
4. Per-session lines readable; audience + Empfänger count shown.
5. Open composer → draft lists affected sessions; cancel → impact remains.
6. Real send optional (DATA_BLOCKED zero-recipient acceptable on STAGE).

## Deferred

- Planner multi-select / Wochenplaner bulk DnD grouped impact (reuse 01D domain layer)
- SFV async multi-activity inbox (durable persistence)
- Partial subset dispatch
- Match/tournament multi-activity batches
