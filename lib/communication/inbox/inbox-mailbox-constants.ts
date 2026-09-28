export const COMMUNICATION_INBOX_BULK_MAX_IDS = 100;

export type InboxMailboxView = "INBOX" | "STARRED" | "ARCHIVE" | "TRASH";

export const INBOX_MAILBOX_VIEWS: InboxMailboxView[] = [
  "INBOX",
  "STARRED",
  "ARCHIVE",
  "TRASH",
];
