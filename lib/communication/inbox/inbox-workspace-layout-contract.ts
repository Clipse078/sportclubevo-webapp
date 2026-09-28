/**
 * DOM / class contract for Inbox workspace height and scroll ownership (SCE-COMM-HOTFIX-01).
 * jsdom tests assert these markers — not pixel geometry.
 */

export const INBOX_WORKSPACE_ROOT_SELECTOR = "[data-communication-inbox-workspace]";
export const INBOX_LAYOUT_ROOT_SELECTOR = "[data-communication-inbox-layout]";
export const INBOX_LIST_PANE_SELECTOR = "[data-inbox-list-pane]";
export const INBOX_DETAIL_PANE_SELECTOR = "[data-inbox-detail-pane]";
export const INBOX_LIST_SCROLL_SELECTOR = "[data-inbox-list-scroll]";
export const INBOX_DETAIL_SCROLL_SELECTOR = "[data-inbox-detail-scroll]";

/** Workspace fills viewport band beneath Kommunikationscenter chrome without growing the document. */
export const INBOX_WORKSPACE_HEIGHT_CLASS =
  "h-[calc(100dvh-12rem)] max-h-[calc(100dvh-12rem)] min-h-0 overflow-hidden";

/** Mobile: avoid fixed desktop viewport height; single-column flow may use page scroll. */
export const INBOX_WORKSPACE_HEIGHT_MOBILE_OVERRIDE =
  "max-lg:h-auto max-lg:max-h-none max-lg:min-h-[min(720px,calc(100dvh-15rem))]";

export const INBOX_PANE_SHELL_CLASS = "flex h-full min-h-0 min-w-0 flex-col";

export const INBOX_LIST_SCROLL_CLASS = "min-h-0 flex-1 overflow-y-auto overflow-x-hidden";
export const INBOX_DETAIL_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden";
