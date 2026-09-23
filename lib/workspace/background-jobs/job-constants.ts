/**
 * WORKSPACE-08-05 — bounded workspace background job execution limits.
 */

export const WORKSPACE_BACKGROUND_JOB_DEFAULT_MAX_ATTEMPTS = 5;

/** Worker lease — stale leases become reclaimable (at-least-once). */
export const WORKSPACE_BACKGROUND_JOB_LEASE_MS = 5 * 60 * 1000;

/** Initial retry backoff; doubles per attempt capped at max. */
export const WORKSPACE_BACKGROUND_JOB_RETRY_BASE_MS = 30_000;
export const WORKSPACE_BACKGROUND_JOB_RETRY_MAX_MS = 60 * 60 * 1000;

/** Cron dispatcher global claim cap per invocation. */
export const WORKSPACE_BACKGROUND_JOB_DISPATCH_BATCH_SIZE = 15;

/** Per-tenant cap within one dispatch (fairness). */
export const WORKSPACE_BACKGROUND_JOB_DISPATCH_PER_TENANT_CAP = 3;

/** Legacy NOT_SCANNED backfill batch (explicit operator seam only). */
export const WORKSPACE_LEGACY_SCAN_BACKFILL_DEFAULT_BATCH_SIZE = 50;

/** Malware scan worker timeout budget (provider + storage read). */
export const WORKSPACE_MALWARE_SCAN_WORKER_TIMEOUT_MS = 45_000;
