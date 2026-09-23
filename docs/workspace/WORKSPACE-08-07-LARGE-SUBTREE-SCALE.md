# WORKSPACE-08-07 — Large Subtree Scale + Async Destructive Operations

## CURRENT_SUBTREE_BEHAVIOUR

- Folder subtree collection uses BFS in `folder-subtree.ts` (application-level recursion, N+1 child queries).
- Folder trash / restore / archive (except trash async path) use `collectWorkspaceFolderSubtreeIds` + single transaction `updateMany` / `deleteMany` with large `IN (...)` lists.
- Folder permanent delete purges each document synchronously, then deletes all folder rows in one transaction (`folder-delete-service.ts`).

## SCALE_RISKS

- Unbounded subtree materialization in memory for large trees.
- Serverless request timeouts (10–60s) on wide/deep trees.
- Long DB transactions + row locks on folder trash/delete.
- Per-document purge loops inside one HTTP request.

## OPERATION_CLASSIFICATION

| Operation | Decision | Rationale |
|-----------|----------|-----------|
| FOLDER_TRASH | ASYNC_ABOVE_THRESHOLD | Large `IN` lists + long transactions; batched CTE updates via background job. |
| FOLDER_PERMANENT_DELETE | ASYNC_ABOVE_THRESHOLD | Document purge + storage fan-out; must batch per W08-05/06. |
| FOLDER_ARCHIVE | SYNC_ONLY | Requires empty active children; bounded to one folder row. |
| FOLDER_RESTORE | SYNC_WITH_LIMIT | Subtree restore is one transaction; typical trash subtree sizes mirror trash; remains sync (same as W06). |
| FOLDER_MOVE | SYNC_WITH_LIMIT | W02 inheritance/security-sensitive; no async move in W08-07 (explicit size limit deferred to W08-08/performance). |

## THRESHOLD

- Env: `WORKSPACE_ASYNC_SUBTREE_THRESHOLD` (server-only).
- Default: **1000** (`WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT`).
- Valid range: 100–10000.

## COUNT_DEFINITION

**totalNodes = folderCount + documentCount** where:

- `folderCount`: folders in recursive subtree rooted at operation root (inclusive).
- `documentCount`: documents with `folderId` in that subtree.

## BOUNDED_PLANNER

`probeWorkspaceSubtreeNodeCount` uses PostgreSQL recursive CTE + `LIMIT threshold+1` probes — no full 10k materialization in the request path.

## SYNC_FAST_PATH

Below/equal threshold → existing synchronous services (`deleteWorkspaceFolderPermanently`, `trashWorkspaceFolderSubtree`).

## ASYNC_OPERATION_MODEL

- Durable `WorkspaceSubtreeOperation` (identity, status, progress counters).
- Execution via `WorkspaceBackgroundJob` type `SUBTREE_OPERATION_BATCH` (single queue — no competing executor).

## OPERATION_IDENTITY

- CUID `WorkspaceSubtreeOperation.id` scoped by `tenantId` + `rootFolderId` + `type`.
- Active dedup index prevents duplicate PENDING/RUNNING operations for same root/type.

## REQUEST_AUTHORIZATION

- Same as W06: `WORKSPACE_DELETE` + `assertWorkspaceFolderDestructiveSubtreeManage` before enqueue (server actions).
- Break-glass does not grant delete; no worker-side ACL bypass.

## EXECUTION_AUTHORITY

- Worker executes **already authorized** operations under system actor metadata.
- Revalidates purge eligibility, holds, references at batch time via `purgeWorkspaceDocumentPermanently` / folder eligibility.

## EXECUTION_SAFETY_REVALIDATION

Mutable blockers re-checked each batch: retention, holds, W07/W06 references, trashed state, storage purge errors.

## SCOPE_SEMANTICS

- **Root fixed** at operation creation.
- **Dynamic subtree** at execution: recursive CTE selects current descendants under root.
- Folder/document moved **out** of root subtree before processing → **not** deleted/trashed by operation.
- **New children** under root after enqueue → included in dynamic subtree (documented deterministic behaviour: operation applies to current tree under root).

## TREE_MUTATION_RACES

See SCOPE_SEMANTICS; blockers evaluated at execution; stale plans cannot override new holds/references.

## BATCHING

- `WORKSPACE_SUBTREE_OPERATION_BATCH_SIZE = 25` items per batch.
- One transaction per folder leaf batch or trash batch — never whole subtree.

## PERMANENT_DELETE_ORDERING

1. Purge documents in batches (deepest content first by stable document id ordering).
2. Delete leaf folders bottom-up via depth-ordered CTE.
3. Root deleted when it becomes a leaf.

## STORAGE_INTERACTION

Document purge reuses W08-05/06 provider-aware purge + retry; storage deletes not bundled in large DB transactions.

## TRASH_SEMANTICS

Large trash returns `{ mode: "ASYNC", operationId, status: "PENDING" }`; root remains until batches complete; audit on terminal success.

## ARCHIVE_DECISION / RESTORE_DECISION / MOVE_DECISION

See OPERATION_CLASSIFICATION.

## PROGRESS

`WorkspaceSubtreeOperationStatusDto` — counts + status only (no descendant IDs/names/storage).

## STATUS_AUTHORIZATION

Requester or `WORKSPACE_DELETE` or MANAGE on root folder; cross-tenant → 404 zero disclosure.

## FAILURE_SEMANTICS

`PENDING | RUNNING | SUCCEEDED | PARTIALLY_BLOCKED | FAILED` — blocked descendants stop folder phase; no unsafe parent delete.

## DEDUPLICATION

DB partial unique index + job dedup key `SUBTREE_OPERATION_BATCH:{operationId}`.

## CANCELLATION

**CANCELLATION_SUPPORTED = NO** — destructive batches cannot be safely rolled back across storage.

## AUDIT

`SUBTREE_OPERATION_*` events correlate by `operationId`; terminal folder events reuse `FOLDER_TRASHED` / `FOLDER_PERMANENTLY_DELETED`.

## OBSERVABILITY

`getWorkspaceBackgroundJobQueueHealth` extended with subtree operation backlog metrics.

## SCALE_TESTS

`subtree-planner.test.ts` — threshold boundaries + 10k probe mock.

## MOBILE_READY_DTO

Async + status DTOs expose `operationId` only — not internal job ids.

## RESIDUAL_RISKS

- Request-time destructive ACL still walks full subtree for auth (acceptable near threshold; future batched auth).
- Very large sync restore/archive transactions unchanged.

## W08_08_READINESS

W08-08 should run full regression matrix, disposable Postgres migration proof, and optional auth/planner perf hardening.
