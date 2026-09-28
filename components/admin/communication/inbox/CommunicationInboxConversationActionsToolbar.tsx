"use client";

import type { ReactNode } from "react";
import { MoreHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InboxMailboxView } from "@/lib/communication/inbox/inbox-mailbox-constants";

type CommunicationInboxConversationActionsToolbarProps = {
  mailbox: InboxMailboxView;
  starred: boolean;
  unread: boolean;
  canManage: boolean;
  busy: boolean;
  onToggleStar: () => void;
  onArchive: () => void;
  onRestoreToInbox: () => void;
  onTrash: () => void;
  onRestoreFromTrash: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
};

export function CommunicationInboxConversationActionsToolbar({
  mailbox,
  starred,
  unread,
  canManage,
  busy,
  onToggleStar,
  onArchive,
  onRestoreToInbox,
  onTrash,
  onRestoreFromTrash,
  onMarkRead,
  onMarkUnread,
}: CommunicationInboxConversationActionsToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] px-4 py-2"
      role="toolbar"
      aria-label="Konversationsaktionen"
    >
      {mailbox !== "TRASH" ? (
        <ActionButton
          disabled={busy}
          onClick={onToggleStar}
          label={starred ? "Markierung entfernen" : "Markieren"}
          pressed={starred}
        >
          <Star className={cn("h-3.5 w-3.5", starred && "fill-current text-amber-500")} aria-hidden />
          <span>{starred ? "Markierung entfernen" : "Markieren"}</span>
        </ActionButton>
      ) : null}
      {mailbox === "INBOX" && canManage ? (
        <>
          <ActionButton disabled={busy} onClick={onArchive} label="Archivieren" />
          <ActionButton disabled={busy} onClick={onTrash} label="Papierkorb" />
        </>
      ) : null}
      {mailbox === "ARCHIVE" && canManage ? (
        <>
          <ActionButton disabled={busy} onClick={onRestoreToInbox} label="Zurück in Posteingang" />
          <ActionButton disabled={busy} onClick={onTrash} label="Papierkorb" />
        </>
      ) : null}
      {mailbox === "TRASH" && canManage ? (
        <ActionButton disabled={busy} onClick={onRestoreFromTrash} label="Wiederherstellen" />
      ) : null}
      <ActionButton
        disabled={busy}
        onClick={unread ? onMarkRead : onMarkUnread}
        label={unread ? "Als gelesen markieren" : "Als ungelesen markieren"}
      />
      <button
        type="button"
        disabled={busy}
        aria-label="Weitere Aktionen"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)] disabled:opacity-60"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ActionButton({
  children,
  label,
  onClick,
  disabled,
  pressed,
}: {
  children?: ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--foreground)]",
        "hover:bg-[var(--surface-2)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        pressed && "border-amber-400/60 bg-amber-50/40",
      )}
    >
      {children ?? label}
    </button>
  );
}
