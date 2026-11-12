/** Payload schema version stored in payloadJson.v */
/** v4 — German programme activity labels for meetings (SCE-DASH-UX-01R2). */
export const PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION = 4 as const;

/** Maximum age before a projection is considered stale and triggers background rebuild. */
export const PERSONAL_DASHBOARD_READ_MODEL_MAX_AGE_MS = 5 * 60 * 1000;

/** Rebuild horizon: feed window + one calendar month padding is applied at rebuild time. */
export const PERSONAL_DASHBOARD_REBUILD_FEED_DAYS = 14;
