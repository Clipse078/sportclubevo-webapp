/** Scheduler batch size per cron tick (Vercel cron cadence defines precision). */
export const COMM_PUBLICATION_SCHEDULE_DISPATCH_BATCH_SIZE = 25;

/** Lease for PROCESSING rows before stale recovery re-claims. */
export const COMM_PUBLICATION_SCHEDULE_LEASE_MS = 15 * 60 * 1000;

export const COMM_PUBLICATION_SCHEDULE_DEFAULT_MAX_ATTEMPTS = 5;

/** Vercel cron runs every minute — publication precision is ~1 minute, not seconds. */
export const COMM_PUBLICATION_SCHEDULER_CRON_CADENCE = "*/1 * * * *";
