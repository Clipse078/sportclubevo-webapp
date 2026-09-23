# WORKSPACE-08-05 — Durable background jobs, scan execution, retries & observability

**Status:** Implemented on branch `cursor/workspace-08-governance-scale-portability`  
**Migration:** `20260923200000_workspace_08_05_background_jobs`  
**Prerequisites:** W08-01 audit, W08-02 break-glass, W08-03 retention/purge, W08-04 scan model

---

## Delivery semantics (AT-LEAST-ONCE)

Workspace background jobs use **at-least-once** delivery. Handlers must be **idempotent** or **idempotency-guarded**.

| Scenario | Behaviour |
|----------|-----------|
| Duplicate delivery | Terminal scan states short-circuit to job `SUCCEEDED`; purge eligibility re-checked |
| Worker crash after side effect | Scan/audit may repeat; transitions guarded by scan state machine |
| Worker crash before state commit | Lease expires; job reclaimable (`RUNNING` + expired `leaseExpiresAt`) |
| Retry | Bounded exponential backoff (`RETRY` + `availableAt`) |
| Stale lease | Expired `RUNNING` rows reclaimable via `FOR UPDATE SKIP LOCKED` |
| Concurrent workers | PostgreSQL claim prevents intentional dual active leases |

Business correctness does **not** assume exactly-once execution.

---

## JOB_MODEL

`WorkspaceBackgroundJob` (tenant-scoped):

- Identity: `id`, `tenantId`, `type`, `status`
- Payload: canonical JSON (`workspaceDocumentVersionId`, `workspaceDocumentId`) — no storage locators, signed URLs, secrets, or raw scanner output
- Execution: `attemptCount`, `maxAttempts`, `availableAt`, `claimedAt`, `leaseExpiresAt`
- Terminal: `completedAt`, `failedAt`, `lastErrorCode` (bounded code only)
- Dedup: optional `deduplicationKey` + partial unique index for active statuses

## JOB_STATES

`PENDING` → `RUNNING` → (`SUCCEEDED` | `RETRY` | `DEAD`)

Legal transitions enforced in `job-status.ts`. Expired `RUNNING` leases become claimable again.

## CLAIMING / LEASES

Cron dispatcher claims via `claimWorkspaceBackgroundJobs()` using `FOR UPDATE SKIP LOCKED`, tenant-fair row numbering, global batch cap, and 5-minute leases.

## IDEMPOTENCY / DEDUPLICATION

Malware scan jobs dedupe on `(tenantId, MALWARE_SCAN_VERSION:{versionId})` while active. Retries reuse the same logical job; deliberate future re-scans require a new operation identity (future seam).

## SCAN_EXECUTION

Handler: `executeMalwareScanVersionJob`

1. Validate tenant + immutable `WorkspaceDocumentVersion.id`
2. Load scan row; terminal scan → job success
3. `PENDING` → `SCANNING` → provider → map result
4. `INFECTED` / `UNSCANNABLE` / `CLEAN` → job `SUCCEEDED` when scanner completed
5. `FAILED` / transient errors → bounded `RETRY` → `DEAD`

Scan state and job state remain **independent** (e.g. `INFECTED` + job `SUCCEEDED`).

## PROVIDER_RESULTS

Mapped via existing W08-04 `applyWorkspaceMalwareScannerResult`. Unconfigured provider returns `FAILED` / `SCANNER_NOT_CONFIGURED` — never `CLEAN`.

## RETRIES / DEAD_LETTER

Retryable: provider timeout/outage, transient storage, unconfigured scanner (until max attempts).  
Non-retryable: tenant mismatch, missing target, invalid payload, purge ineligible.  
`DEAD` jobs retained; manual requeue requires `workspace.governance.manage` + audit.

## PURGE_RECOVERY

If storage delete succeeds but relational delete fails, `PURGE_RETRY_SCHEDULED` audit + `DOCUMENT_PURGE_FINALIZE` job (`storagePhaseCompleted: true`) completes DB cleanup after eligibility re-check.

## CRON_DISPATCH

`GET /api/cron/workspace-background-jobs` — `CRON_SECRET` bearer, bounded batch, safe JSON counts only.

## LEGACY_SCAN_BACKFILL

`POST /api/workspace/governance/background-jobs/legacy-scan-backfill` — tenant-scoped, bounded, resumable (`cursorVersionId`), auditable, **never** run from migrations.

## OBSERVABILITY

`GET /api/workspace/governance/background-jobs/health` — queue depth, oldest pending, scan backlog counts (no filenames/storage keys).

Metrics/logs/audit separation preserved — lease polling is not audited.

## REAL_SCANNER_STATUS

| Flag | Value |
|------|-------|
| REAL_SCANNER_PROVIDER_IMPLEMENTED | Architecture only (`WorkspaceMalwareScannerProvider`) |
| REAL_SCANNER_CONFIGURED | **NO** (`unconfigured`) |
| REAL_SCAN_EXECUTED | **NO** |

## ENFORCEMENT_ROLLOUT

W08-05 does **not** switch tenants to `ENFORCED_CLEAN_ONLY`. Rollout requires explicit policy change after scanner + backlog readiness.

## W08_06_SEAMS / W08_07_SEAMS

- W08-06: inject real scanner + storage streaming optimisations
- W08-07: subtree destructive operations as chunked `WorkspaceBackgroundJob` types

## RESIDUAL_RISKS

- Neon/serverless cron duration limits — keep batches bounded
- Stuck `SCANNING` recovered via stale lease path (10-minute threshold)
- No automatic legacy corpus enqueue
