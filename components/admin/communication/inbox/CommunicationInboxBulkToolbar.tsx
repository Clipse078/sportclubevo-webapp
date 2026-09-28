"use client";

import type { InboxMailboxView } from "@/lib/communication/inbox/inbox-mailbox-constants";

type CommunicationInboxBulkToolbarProps = {
  selectedCount: number;
  mailbox: InboxMailboxView;
  canManage: boolean;
  busy: boolean;
  onArchive: () => void;
  onRestoreToInbox: () => void;
  onTrash: () => void;
  onRestoreFromTrash: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onStar: () => void;
  onUnstar: () => void;
  onClearSelection: () => void;
};

export function CommunicationInboxBulkToolbar({
  selectedCount,
  mailbox,
  canManage,
  busy,
  onArchive,
  onRestoreToInbox,
  onTrash,
  onRestoreFromTrash,
  onMarkRead,
  onMarkUnread,
  onStar,
  onUnstar,
  onClearSelection,
}: CommunicationInboxBulkToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/50 px-3 py-2"
      role="toolbar"
      aria-label="Massenaktionen"
    >
      <span className="text-xs font-semibold text-[var(--foreground)]">
        {selectedCount} ausgewählt
      </span>
      <button
        type="button"
        onClick={onClearSelection}
        className="text-xs text-[var(--sce-primary)] underline-offset-2 hover:underline"
      >
        Auswahl aufheben
      </button>
      <div className="flex flex-wrap gap-1.5">
        {mailbox === "INBOX" && canManage ? (
          <>
            <BulkButton disabled={busy} onClick={onArchive} label="Archivieren" />
            <BulkButton disabled={busy} onClick={onTrash} label="Papierkorb" />
          </>
        ) : null}
        {mailbox === "ARCHIVE" && canManage ? (
          <>
            <BulkButton disabled={busy} onClick={onRestoreToInbox} label="Zurück in Posteingang" />
            <BulkButton disabled={busy} onClick={onTrash} label="Papierkorb" />
          </>
        ) : null}
        {mailbox === "TRASH" && canManage ? (
          <BulkButton disabled={busy} onClick={onRestoreFromTrash} label="Wiederherstellen" />
        ) : null}
        <BulkButton disabled={busy} onClick={onMarkRead} label="Als gelesen" />
        <BulkButton disabled={busy} onClick={onMarkUnread} label="Als ungelesen" />
        {mailbox !== "TRASH" ? (
          <>
            <BulkButton disabled={busy} onClick={onStar} label="Markieren" />
            <BulkButton disabled={busy} onClick={onUnstar} label="Markierung entfernen" />
          </>
        ) : null}
      </div>
    </div>
  );
}

function BulkButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
    >
      {label}
    </button>
  );
}
