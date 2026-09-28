"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  formatMessageTimestamp,
  formatPersonDisplayName,
  formatUserDisplayName,
  INBOX_CONTEXT_KIND_LABEL,
  INBOX_CONVERSATION_STATUS_LABEL,
  resolveInboxParticipantLabel,
} from "@/lib/communication/inbox/inbox-display";
import { SCE_SURFACE_STANDARD_PANEL } from "@/lib/shell/sce-surface-system";
import type { InboxMailboxView } from "@/lib/communication/inbox/inbox-mailbox-constants";
import { CommunicationInboxConversationActionsToolbar } from "@/components/admin/communication/inbox/CommunicationInboxConversationActionsToolbar";
import type {
  CommunicationInboxCapabilities,
  InboxConversationDetail,
  InboxConversationListItem,
} from "@/components/admin/communication/inbox/inbox-workspace-types";

type CommunicationInboxConversationDetailProps = {
  selectedConversationId: string | null;
  listItem: InboxConversationListItem | null;
  detail: InboxConversationDetail | null;
  capabilities: CommunicationInboxCapabilities;
  mailbox: InboxMailboxView;
  loading: boolean;
  detailError: string | null;
  actionBusy: boolean;
  onRetryDetail: () => void;
  onToggleStar: () => void;
  onArchive: () => void;
  onRestoreToInbox: () => void;
  onTrash: () => void;
  onRestoreFromTrash: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  showProcessingToolbar: boolean;
  replyDisabled: boolean;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  onSendReply: () => void;
  replySubmitting: boolean;
  replyError: string | null;
  actionError: string | null;
  onBackToList: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onAssignToMe: () => void;
  onUnassign: () => void;
  visible: boolean;
  hasAnyConversations: boolean;
};

function resolveDetailParticipant(
  detail: InboxConversationDetail,
  listItem: InboxConversationListItem | null,
): { label: string; email: string | null } {
  const inbound = [...detail.messages]
    .reverse()
    .find((message) => message.direction === "INBOUND");
  const label =
    listItem?.participantLabel ??
    resolveInboxParticipantLabel({
      matchedPerson: detail.matchedPerson ?? null,
      matchedSponsorContact: detail.matchedSponsorContact ?? null,
      latestInbound: inbound
        ? {
            fromDisplayName: inbound.fromDisplayName ?? null,
            fromAddress: inbound.fromAddress,
          }
        : null,
    });
  const email =
    detail.matchedPerson?.email ??
    detail.matchedSponsorContact?.email ??
    inbound?.fromAddress ??
    listItem?.participantEmail ??
    null;
  return { label, email };
}

export function CommunicationInboxConversationDetailPane({
  selectedConversationId,
  listItem,
  detail,
  capabilities,
  mailbox,
  loading,
  detailError,
  actionBusy,
  onRetryDetail,
  onToggleStar,
  onArchive,
  onRestoreToInbox,
  onTrash,
  onRestoreFromTrash,
  onMarkRead,
  onMarkUnread,
  showProcessingToolbar,
  replyDisabled,
  replyText,
  onReplyTextChange,
  onSendReply,
  replySubmitting,
  replyError,
  actionError,
  onBackToList,
  onResolve,
  onReopen,
  onAssignToMe,
  onUnassign,
  visible,
  hasAnyConversations,
}: CommunicationInboxConversationDetailProps) {
  const hasSelection = selectedConversationId != null;
  const detailMatchesSelection =
    detail != null && detail.id === selectedConversationId;
  const showLoadedDetail = detailMatchesSelection && !loading;

  const listPreviewLabel =
    listItem?.participantLabel ??
    (detailMatchesSelection ? resolveDetailParticipant(detail, listItem).label : null);
  const listPreviewSubject =
    listItem?.subject?.trim() ||
    (detailMatchesSelection ? detail.subject?.trim() || "(Kein Betreff)" : null);

  return (
    <section
      className={cn(
        SCE_SURFACE_STANDARD_PANEL,
        "flex min-h-0 flex-col overflow-hidden",
        visible ? "flex" : "hidden lg:flex",
      )}
      aria-label="Konversationsdetail"
    >
      {!hasSelection ? (
        <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
          {hasAnyConversations ? (
            <p className="text-sm text-[var(--text-2)]">Wählen Sie eine Konversation aus.</p>
          ) : (
            <p className="text-sm text-[var(--text-2)]">
              Sobald Konversationen vorhanden sind, öffnen Sie diese hier.
            </p>
          )}
        </div>
      ) : detailError && !detailMatchesSelection ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <p className="text-sm text-red-600" role="alert">
            {detailError}
          </p>
          <Button type="button" variant="secondary" onClick={onRetryDetail}>
            Erneut versuchen
          </Button>
        </div>
      ) : !showLoadedDetail ? (
        <div className="flex flex-1 flex-col px-4 py-6">
          <button
            type="button"
            className="mb-4 inline-flex items-center gap-1 self-start text-xs font-medium text-[var(--sce-primary)] lg:hidden"
            onClick={onBackToList}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Konversationen
          </button>
          {listPreviewLabel ? (
            <p className="text-sm font-semibold text-[var(--foreground)]">{listPreviewLabel}</p>
          ) : null}
          {listPreviewSubject ? (
            <p className="mt-1 text-sm text-[var(--text-2)]">{listPreviewSubject}</p>
          ) : null}
          <p className="mt-6 text-sm text-[var(--text-2)]" aria-live="polite">
            Konversation wird geladen …
          </p>
        </div>
      ) : (
        <>
          <header className="shrink-0 border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button
                  type="button"
                  className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--sce-primary)] lg:hidden"
                  onClick={onBackToList}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Konversationen
                </button>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {resolveDetailParticipant(detail, listItem).label}
                </p>
                {resolveDetailParticipant(detail, listItem).email ? (
                  <p className="mt-0.5 truncate text-xs text-[var(--text-2)]">
                    {resolveDetailParticipant(detail, listItem).email}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-[var(--foreground)]">
                  {detail.subject?.trim() || "(Kein Betreff)"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
                  <span>
                    {INBOX_CONVERSATION_STATUS_LABEL[detail.status] ?? detail.status}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {detail.assignedToUserId === capabilities.currentUserId
                      ? "Mir zugewiesen"
                      : detail.assignedToUser
                        ? formatUserDisplayName(detail.assignedToUser)
                        : "Nicht zugewiesen"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.matchedPerson ? (
                    <Link
                      href={`/dashboard/persons/${detail.matchedPerson.id}`}
                      className="text-xs font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline"
                    >
                      {formatPersonDisplayName(detail.matchedPerson)}
                    </Link>
                  ) : null}
                  {(detail.contextLinks ?? []).map((link) => (
                    <span
                      key={link.id}
                      className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--text-2)]"
                    >
                      {INBOX_CONTEXT_KIND_LABEL[link.contextKind] ?? link.contextKind}
                    </span>
                  ))}
                </div>
              </div>
              {capabilities.canManage && detail.mailboxOrganization !== "TRASHED" ? (
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  {detail.status === "OPEN" ? (
                    <Button type="button" variant="secondary" onClick={onResolve}>
                      Als erledigt markieren
                    </Button>
                  ) : (
                    <Button type="button" variant="secondary" onClick={onReopen}>
                      Wieder öffnen
                    </Button>
                  )}
                  {detail.assignedToUserId === capabilities.currentUserId ? (
                    <Button type="button" variant="secondary" onClick={onUnassign}>
                      Zuweisung entfernen
                    </Button>
                  ) : (
                    <Button type="button" variant="secondary" onClick={onAssignToMe}>
                      Mir zuweisen
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
            {actionError ? (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {actionError}
              </p>
            ) : null}
          </header>

          {showProcessingToolbar ? (
            <CommunicationInboxConversationActionsToolbar
              mailbox={mailbox}
              starred={listItem?.starred ?? false}
              unread={listItem?.unread ?? false}
              canManage={capabilities.canManage}
              busy={actionBusy}
              onToggleStar={onToggleStar}
              onArchive={onArchive}
              onRestoreToInbox={onRestoreToInbox}
              onTrash={onTrash}
              onRestoreFromTrash={onRestoreFromTrash}
              onMarkRead={onMarkRead}
              onMarkUnread={onMarkUnread}
            />
          ) : null}

          {loading ? (
            <p className="px-4 py-2 text-sm text-[var(--text-2)]" aria-live="polite">
              Konversation wird geladen …
            </p>
          ) : null}

          {detailError ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <p className="text-sm text-red-600" role="alert">
                {detailError}
              </p>
              <Button type="button" variant="secondary" onClick={onRetryDetail}>
                Erneut versuchen
              </Button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {detail.messages.map((message) => {
              const outbound = message.direction === "OUTBOUND";
              const timestamp = message.sentAt ?? message.receivedAt;
              return (
                <article
                  key={message.id}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm",
                    outbound
                      ? "ml-4 border-[var(--sce-primary)]/25 bg-[var(--surface-2)]/80"
                      : "mr-4 border-[var(--border)] bg-[var(--surface)]",
                  )}
                  aria-label={outbound ? "Ausgehende Nachricht" : "Eingehende Nachricht"}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[var(--text-2)]">
                    <span>
                      {outbound ? "Ausgehend" : "Eingehend"}
                      {message.fromAddress ? ` · ${message.fromAddress}` : ""}
                    </span>
                    <time dateTime={timestamp ?? undefined}>
                      {formatMessageTimestamp(timestamp)}
                    </time>
                  </div>
                  {message.status === "FAILED" ? (
                    <p className="mt-1 text-xs font-medium text-red-600">Zustellung fehlgeschlagen</p>
                  ) : null}
                  {message.bodyHtmlSanitized ? (
                    <div
                      className="prose prose-sm mt-2 max-w-none text-[var(--foreground)]"
                      dangerouslySetInnerHTML={{ __html: message.bodyHtmlSanitized }}
                    />
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-[var(--foreground)]">
                      {message.bodyText}
                    </p>
                  )}
                  {message.deliveryError ? (
                    <p className="mt-2 text-xs text-red-600">{message.deliveryError}</p>
                  ) : null}
                </article>
              );
            })}
          </div>

          {capabilities.canReply && !replyDisabled ? (
            <div className="shrink-0 border-t border-[var(--border)] p-4">
              <label className="block text-xs font-medium text-[var(--text-2)]" htmlFor="inbox-reply">
                Antwort
              </label>
              <textarea
                id="inbox-reply"
                value={replyText}
                onChange={(event) => onReplyTextChange(event.target.value)}
                rows={4}
                placeholder="Antwort verfassen …"
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
              />
              {replyError ? (
                <p className="mt-2 text-xs text-red-600" role="alert">
                  {replyError}
                </p>
              ) : null}
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={onSendReply}
                  disabled={!replyText.trim() || replySubmitting}
                >
                  {replySubmitting ? "Senden …" : "Antwort senden"}
                </Button>
              </div>
            </div>
          ) : null}
          {replyDisabled ? (
            <p className="shrink-0 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-2)]">
              Antworten ist im Papierkorb nicht verfügbar. Bitte zuerst wiederherstellen.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
