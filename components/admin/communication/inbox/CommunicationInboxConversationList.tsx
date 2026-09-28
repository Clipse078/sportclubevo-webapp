"use client";

import { Mail, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatConversationTimestamp } from "@/lib/communication/inbox/inbox-display";
import { SCE_SURFACE_STANDARD_PANEL } from "@/lib/shell/sce-surface-system";
import type { InboxConversationListItem } from "@/components/admin/communication/inbox/inbox-workspace-types";

type CommunicationInboxConversationListProps = {
  conversations: InboxConversationListItem[];
  selectedId: string | null;
  currentUserId: string;
  loading: boolean;
  listError: string | null;
  emptyVariant: "none" | "filter" | "search";
  onSelect: (conversationId: string) => void;
  onResetFilters: () => void;
  visible: boolean;
  nextCursor: string | null;
  onLoadMore: () => void;
  loadingMore: boolean;
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
  conversations,
  selectedId,
  currentUserId,
  loading,
  listError,
  emptyVariant,
  onSelect,
  onResetFilters,
  visible,
  nextCursor,
  onLoadMore,
  loadingMore,
}: CommunicationInboxConversationListProps) {
  return (
    <section
      className={cn(
        SCE_SURFACE_STANDARD_PANEL,
        "flex min-h-0 flex-col overflow-hidden",
        visible ? "flex" : "hidden lg:flex",
      )}
      aria-label="Konversationsliste"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Konversationen</h2>
        <span className="text-xs text-[var(--text-2)]" aria-live="polite">
          {loading ? "Lädt …" : conversations.length}
        </span>
      </div>

      {listError ? (
        <p className="px-4 py-6 text-sm text-red-600" role="alert">
          {listError}
        </p>
      ) : null}

      <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Konversationen">
        <ul className="divide-y divide-[var(--border)]">
          {conversations.map((conversation) => {
            const selected = selectedId === conversation.id;
            const assignment = assignmentHint(conversation, currentUserId);
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]",
                    selected
                      ? "border-l-2 border-l-[var(--sce-primary)] bg-[var(--surface-2)]"
                      : "border-l-2 border-l-transparent hover:bg-[var(--surface-2)]/70",
                    conversation.unread && !selected && "bg-[var(--surface)]",
                  )}
                  onClick={() => onSelect(conversation.id)}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-2)]"
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
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--text-2)]">
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
              </li>
            );
          })}
        </ul>

        {!loading && conversations.length === 0 && !listError ? (
          <div className="px-4 py-8 text-center">
            {emptyVariant === "none" ? (
              <>
                <Mail className="mx-auto h-7 w-7 text-[var(--text-2)]" aria-hidden />
                <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                  Noch keine Konversationen
                </p>
                <p className="mt-1 text-xs text-[var(--text-2)]">
                  Eingehende Nachrichten erscheinen hier, sobald sie synchronisiert wurden.
                </p>
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
