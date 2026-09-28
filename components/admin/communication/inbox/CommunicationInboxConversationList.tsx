"use client";

import { Mail, Star, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatConversationTimestamp } from "@/lib/communication/inbox/inbox-display";
import type { InboxMailboxView } from "@/lib/communication/inbox/inbox-mailbox-constants";
import { SCE_SURFACE_STANDARD_PANEL } from "@/lib/shell/sce-surface-system";
import { CommunicationInboxBulkToolbar } from "@/components/admin/communication/inbox/CommunicationInboxBulkToolbar";
import type { InboxWorkspaceDensity } from "@/lib/communication/inbox/inbox-workspace-preferences";
import type { InboxConversationListItem } from "@/components/admin/communication/inbox/inbox-workspace-types";

type CommunicationInboxConversationListProps = {
  mailbox: InboxMailboxView;
  conversations: InboxConversationListItem[];
  selectedId: string | null;
  selectedIds: Set<string>;
  currentUserId: string;
  canManage: boolean;
  bulkBusy: boolean;
  loading: boolean;
  listError: string | null;
  emptyVariant: "none" | "filter" | "search" | "mailbox";
  mailboxEmptyLabel: string;
  onSelect: (conversationId: string) => void;
  onToggleSelected: (conversationId: string, checked: boolean) => void;
  onToggleStar: (conversationId: string, starred: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onResetFilters: () => void;
  onBulkArchive: () => void;
  onBulkRestoreToInbox: () => void;
  onBulkTrash: () => void;
  onBulkRestoreFromTrash: () => void;
  onBulkMarkRead: () => void;
  onBulkMarkUnread: () => void;
  onBulkStar: () => void;
  onBulkUnstar: () => void;
  onClearSelection: () => void;
  visible: boolean;
  nextCursor: string | null;
  onLoadMore: () => void;
  loadingMore: boolean;
  density?: InboxWorkspaceDensity;
};

function assignmentHint(
  conversation: InboxConversationListItem,
  currentUserId: string,
): string | null {
  if (!conversation.assignedToUserId) {
    return "Nicht zugewiesen";
  }
  if (conversation.assignedToUserId === currentUserId) {
    return "Mir zugewiesen";
  }
  if (conversation.assignedToDisplayName) {
    return conversation.assignedToDisplayName;
  }
  return "Zugewiesen";
}

export function CommunicationInboxConversationList({
  mailbox,
  conversations,
  selectedId,
  selectedIds,
  currentUserId,
  canManage,
  bulkBusy,
  loading,
  listError,
  emptyVariant,
  mailboxEmptyLabel,
  onSelect,
  onToggleSelected,
  onToggleStar,
  onSelectAll,
  onResetFilters,
  onBulkArchive,
  onBulkRestoreToInbox,
  onBulkTrash,
  onBulkRestoreFromTrash,
  onBulkMarkRead,
  onBulkMarkUnread,
  onBulkStar,
  onBulkUnstar,
  onClearSelection,
  visible,
  nextCursor,
  onLoadMore,
  loadingMore,
  density = "STANDARD",
}: CommunicationInboxConversationListProps) {
  const densityRow =
    density === "COMPACT" ? "py-2" : density === "SPACIOUS" ? "py-4" : "py-3";
  const densityAvatar =
    density === "COMPACT" ? "h-7 w-7" : density === "SPACIOUS" ? "h-9 w-9" : "h-8 w-8";
  const densityPreviewClamp =
    density === "COMPACT" ? "line-clamp-1" : density === "SPACIOUS" ? "line-clamp-3" : "line-clamp-2";

  const allSelected =
    conversations.length > 0 && conversations.every((c) => selectedIds.has(c.id));

  return (
    <section
      className={cn(
        SCE_SURFACE_STANDARD_PANEL,
        "flex min-h-0 flex-col overflow-hidden",
        visible ? "flex" : "hidden lg:flex",
      )}
      aria-label="Konversationsliste"
      data-inbox-density={density}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--border)]"
            aria-label="Alle Konversationen auswählen"
            checked={allSelected}
            onChange={(event) => onSelectAll(event.target.checked)}
          />
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Konversationen</h2>
        </div>
        <span className="text-xs text-[var(--text-2)]" aria-live="polite">
          {loading ? "Lädt …" : conversations.length}
        </span>
      </div>

      <CommunicationInboxBulkToolbar
        selectedCount={selectedIds.size}
        mailbox={mailbox}
        canManage={canManage}
        busy={bulkBusy}
        onArchive={onBulkArchive}
        onRestoreToInbox={onBulkRestoreToInbox}
        onTrash={onBulkTrash}
        onRestoreFromTrash={onBulkRestoreFromTrash}
        onMarkRead={onBulkMarkRead}
        onMarkUnread={onBulkMarkUnread}
        onStar={onBulkStar}
        onUnstar={onBulkUnstar}
        onClearSelection={onClearSelection}
      />

      {listError ? (
        <p className="px-4 py-6 text-sm text-red-600" role="alert">
          {listError}
        </p>
      ) : null}

      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Konversationen">
        <ul className="divide-y divide-[var(--border)]">
          {conversations.map((conversation) => {
            const selected = selectedId === conversation.id;
            const checked = selectedIds.has(conversation.id);
            const assignment = assignmentHint(conversation, currentUserId);
            return (
              <li key={conversation.id}>
                <div
                  className={cn(
                    "flex w-full items-start gap-2 px-2 transition-colors",
                    densityRow,
                    selected
                      ? "border-l-2 border-l-[var(--sce-primary)] bg-[var(--surface-2)]"
                      : "border-l-2 border-l-transparent hover:bg-[var(--surface-2)]/70",
                    conversation.unread && !selected && "bg-[var(--surface)]",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-2 h-4 w-4 shrink-0 rounded border-[var(--border)]"
                    aria-label={`Konversation ${conversation.subject ?? conversation.participantLabel} auswählen`}
                    checked={checked}
                    onChange={(event) => {
                      event.stopPropagation();
                      onToggleSelected(conversation.id, event.target.checked);
                    }}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <button
                    type="button"
                    className={cn(
                      "mt-1 shrink-0 rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
                      conversation.starred && "text-amber-500",
                    )}
                    aria-label={
                      conversation.starred
                        ? "Markierung entfernen"
                        : "Konversation markieren"
                    }
                    aria-pressed={conversation.starred}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleStar(conversation.id, !conversation.starred);
                    }}
                  >
                    <Star
                      className={cn("h-4 w-4", conversation.starred && "fill-current")}
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]"
                    onClick={() => onSelect(conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-2)]",
                          densityAvatar,
                        )}
                        aria-hidden
                      >
                        <UserRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm text-[var(--foreground)]",
                              conversation.unread ? "font-semibold" : "font-medium",
                            )}
                          >
                            {conversation.participantLabel}
                            {conversation.unread ? (
                              <span className="sr-only">, ungelesen</span>
                            ) : null}
                            {conversation.starred ? (
                              <span className="sr-only">, markiert</span>
                            ) : null}
                          </span>
                          <time
                            className="shrink-0 text-[11px] tabular-nums text-[var(--text-2)]"
                            dateTime={conversation.lastMessageAt}
                          >
                            {formatConversationTimestamp(conversation.lastMessageAt)}
                          </time>
                        </div>
                        <p
                          className={cn(
                            "mt-0.5 truncate text-xs",
                            conversation.unread
                              ? "font-medium text-[var(--foreground)]"
                              : "text-[var(--text-2)]",
                          )}
                        >
                          {conversation.subject?.trim() || "(Kein Betreff)"}
                        </p>
                        {conversation.previewText ? (
                          <p
                            className={cn(
                              "mt-1 text-xs text-[var(--text-2)]",
                              densityPreviewClamp,
                            )}
                          >
                            {conversation.previewText}
                          </p>
                        ) : null}
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-2)]">
                          <span>{assignment}</span>
                          {conversation.unread ? (
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sce-primary)]"
                              aria-hidden
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {!loading && conversations.length === 0 && !listError ? (
          <div className="px-4 py-8 text-center">
            {emptyVariant === "none" || emptyVariant === "mailbox" ? (
              <>
                <Mail className="mx-auto h-7 w-7 text-[var(--text-2)]" aria-hidden />
                <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                  {mailboxEmptyLabel}
                </p>
                {emptyVariant === "none" ? (
                  <p className="mt-1 text-xs text-[var(--text-2)]">
                    Eingehende Nachrichten erscheinen hier, sobald sie synchronisiert wurden.
                  </p>
                ) : null}
              </>
            ) : null}
            {emptyVariant === "filter" ? (
              <>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Keine passenden Konversationen
                </p>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-3 text-xs font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline"
                >
                  Filter zurücksetzen
                </button>
              </>
            ) : null}
            {emptyVariant === "search" ? (
              <>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  Keine Treffer für diese Suche
                </p>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-3 text-xs font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline"
                >
                  Suche zurücksetzen
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </nav>

      {nextCursor ? (
        <div className="shrink-0 border-t border-[var(--border)] p-3">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] disabled:opacity-60"
          >
            {loadingMore ? "Lädt …" : "Weitere Konversationen"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
