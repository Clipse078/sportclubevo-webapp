import type { ImapFlowError } from "imapflow";

function sanitizeImapErrorFragment(value: string | undefined, maxLength: number): string {
  if (!value) return "";
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isImapFlowError(error: unknown): error is ImapFlowError {
  return (
    error instanceof Error &&
    ("responseStatus" in error ||
      "responseText" in error ||
      "command" in error ||
      "executedCommand" in error)
  );
}

export function formatBillingImapSyncError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "sync failed";
  }

  const redactedMessage = error.message.replace(/pass[^\s]*/gi, "[redacted]");

  if (isImapFlowError(error)) {
    const status = sanitizeImapErrorFragment(error.responseStatus, 20);
    const responseText = sanitizeImapErrorFragment(error.responseText, 240);
    const command = sanitizeImapErrorFragment(error.command ?? error.executedCommand, 40);
    const commandLabel = command || "command";

    if (status) {
      const detail = responseText ? ` ${responseText}` : "";
      return `IMAP ${commandLabel} failed: ${status}${detail}`.slice(0, 500);
    }
  }

  return redactedMessage.slice(0, 500);
}
