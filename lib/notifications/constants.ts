export const NOTIFICATION_HEADER_LATEST_LIMIT = 10;

export const NOTIFICATION_CENTER_PAGE_SIZE = 20;

export const NOTIFICATION_EMAIL_DELIVERY_BATCH_SIZE = 25;

export const NOTIFICATION_EMAIL_MAX_ATTEMPTS = 3;

/** Stale PROCESSING deliveries become retryable after this lease (ms). */
export const NOTIFICATION_EMAIL_PROCESSING_LEASE_MS = 15 * 60 * 1000;

export const TASK_DEADLINE_TENANT_BATCH_SIZE = 50;

export const TASK_DEADLINE_TASK_BATCH_SIZE = 200;

/** Notify when dueAt is within this window (ms) — TASK_DUE_SOON V1 rule. */
export const TASK_DUE_SOON_LEAD_MS = 24 * 60 * 60 * 1000;

/**
 * Series-generated assignment notifications are suppressed when dueAt is
 * farther than this horizon from generation time (storm protection).
 */
export const SERIES_ASSIGNMENT_NOTIFICATION_HORIZON_MS = TASK_DUE_SOON_LEAD_MS;

export const NOTIFICATION_LOG_PREFIX = "[notifications]";
