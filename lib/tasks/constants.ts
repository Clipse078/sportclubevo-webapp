/**
 * AUFGABEN — shared task module limits.
 */

export const MAX_TASK_COMMENT_BODY_LENGTH = 5000;

/** AUFGABEN-06B — bounded mention list per comment (server-enforced). */
export const MAX_TASK_COMMENT_MENTIONS = 20;

export const TASK_MENTION_SEARCH_MIN_CHARS = 2;
export const TASK_MENTION_SEARCH_LIMIT = 25;

/** Max tenant membership rows scanned per mention search (CLUB / ORG_UNIT over-fetch cap). */
export const TASK_MENTION_SEARCH_MAX_DB_ROWS = TASK_MENTION_SEARCH_LIMIT * 6;

export const TASK_TIMELINE_PAGE_SIZE = 28;

/** Max timeline pages scanned server-side for comment deep-link resolution (bounded). */
export const TASK_TIMELINE_ANCHOR_MAX_PAGES = 15;
