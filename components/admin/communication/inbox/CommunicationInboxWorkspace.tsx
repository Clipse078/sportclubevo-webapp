"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommunicationInboxConversationDetailPane } from "@/components/admin/communication/inbox/CommunicationInboxConversationDetail";
import { CommunicationInboxConversationList } from "@/components/admin/communication/inbox/CommunicationInboxConversationList";
import { CommunicationInboxToolbar } from "@/components/admin/communication/inbox/CommunicationInboxToolbar";
import { CommunicationInboxWorkspaceLayout } from "@/components/admin/communication/inbox/CommunicationInboxWorkspaceLayout";
import { useCommunicationInboxWorkspacePreferences } from "@/components/admin/communication/inbox/useCommunicationInboxWorkspacePreferences";
import { inboxLayoutIsMasterDetailOnDesktop } from "@/lib/communication/inbox/inbox-workspace-preferences";
import type { InboxMailboxView } from "@/lib/communication/inbox/inbox-mailbox-constants";
import type {
  CommunicationInboxCapabilities,
  InboxConversationDetail,
  InboxConversationListItem,
  InboxQuickFilterId,
} from "@/components/admin/communication/inbox/inbox-workspace-types";

type CommunicationInboxWorkspaceProps = CommunicationInboxCapabilities;

const MAILBOX_EMPTY_LABELS: Record<InboxMailboxView, string> = {
  INBOX: "Noch keine Konversationen",
  STARRED: "Noch keine markierten Konversationen",
  ARCHIVE: "Das Archiv ist leer",
  TRASH: "Der Papierkorb ist leer",
};

export default function CommunicationInboxWorkspace({
  currentUserId,
  canReply,
  canManage,
}: CommunicationInboxWorkspaceProps) {
  const [mailbox, setMailbox] = useState<InboxMailboxView>("INBOX");
  const [mailboxCounts, setMailboxCounts] = useState<Partial<Record<InboxMailboxView, number>>>(
    {},
  );
  const [filter, setFilter] = useState<InboxQuickFilterId>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [conversations, setConversations] = useState<InboxConversationListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [detail, setDetail] = useState<InboxConversationDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
  const {
    preference: workspacePreference,
    persistError: viewPersistError,
    setLayout: setWorkspaceLayout,
    setDensity: setWorkspaceDensity,
    setListSplitPercent,
    resetToDefaults: resetViewDefaults,
    persistListSplitPercent,
  } = useCommunicationInboxWorkspacePreferences();
  const selectedConversationRef = useRef<string | null>(null);
  selectedConversationRef.current = selectedId;

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (
      inboxLayoutIsMasterDetailOnDesktop(workspacePreference.layout) &&
      selectedId != null
    ) {
      setMobilePane("detail");
    }
  }, [workspacePreference.layout, selectedId]);

  const loadMailboxCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/communication/inbox/conversations?counts=1");
      if (!res.ok) return;
      const data = (await res.json()) as { counts?: Partial<Record<InboxMailboxView, number>> };
      if (data.counts) setMailboxCounts(data.counts);
    } catch {
      // Counts are optional.
    }
  }, []);

  const loadList = useCallback(
    async (mode: "replace" | "append" = "replace", cursor?: string | null) => {
      if (mode === "append") {
        setLoadingMore(true);
      } else {
        setLoadingList(true);
      }
      setListError(null);
      try {
        const params = new URLSearchParams({ filter, mailbox });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/communication/inbox/conversations?${params.toString()}`);
        if (!res.ok) {
          setListError("Konversationen konnten nicht geladen werden.");
          if (mode === "replace") {
            setConversations([]);
            setNextCursor(null);
          }
          return;
        }
        const data = (await res.json()) as {
          items?: InboxConversationListItem[];
          nextCursor?: string | null;
        };
        const items = data.items ?? [];
        setNextCursor(data.nextCursor ?? null);
        setConversations((prev) => (mode === "append" ? [...prev, ...items] : items));
      } catch {
        setListError("Konversationen konnten nicht geladen werden.");
      } finally {
        setLoadingList(false);
        setLoadingMore(false);
      }
    },
    [filter, debouncedSearch, mailbox],
  );

  useEffect(() => {
    void loadList("replace");
    void loadMailboxCounts();
    setSelectedIds(new Set());
  }, [loadList, loadMailboxCounts]);

  const loadDetail = useCallback(async (conversationId: string) => {
    setLoadingDetail(true);
    setDetailError(null);
    setActionError(null);
    setReplyError(null);
    try {
      const res = await fetch(`/api/communication/inbox/conversations/${conversationId}`);
      if (selectedConversationRef.current !== conversationId) {
        return;
      }
      if (!res.ok) {
        setDetail(null);
        setDetailError("Die Konversation konnte nicht geladen werden.");
        return;
      }
      const data = (await res.json()) as { conversation?: InboxConversationDetail };
      if (selectedConversationRef.current !== conversationId) {
        return;
      }
      const conversation = data.conversation ?? null;
      if (!conversation) {
        setDetail(null);
        setDetailError("Die Konversation konnte nicht geladen werden.");
        return;
      }
      setDetail(conversation);
      try {
        await fetch(`/api/communication/inbox/conversations/${conversationId}/read`, {
          method: "POST",
        });
        if (selectedConversationRef.current === conversationId) {
          setConversations((prev) =>
            prev.map((item) =>
              item.id === conversationId ? { ...item, unread: false } : item,
            ),
          );
        }
      } catch {
        // Detail remains visible; read state sync is best-effort.
      }
    } catch {
      if (selectedConversationRef.current !== conversationId) {
        return;
      }
      setDetail(null);
      setDetailError("Die Konversation konnte nicht geladen werden.");
    } finally {
      if (selectedConversationRef.current === conversationId) {
        setLoadingDetail(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError(null);
      setLoadingDetail(false);
      return;
    }
    setDetail(null);
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const repliesLockedInformOnly = useMemo(() => {
    if (!detail) return false;
    return detail.repliesAllowed === false;
  }, [detail]);

  const hasActiveFilters = filter !== "ALL" || debouncedSearch.length > 0;

  const emptyVariant = useMemo(() => {
    if (conversations.length > 0) return null;
    if (debouncedSearch) return "search" as const;
    if (filter !== "ALL") return "filter" as const;
    if (mailbox !== "INBOX") return "mailbox" as const;
    return "none" as const;
  }, [conversations.length, debouncedSearch, filter, mailbox]);

  function resetFilters() {
    setFilter("ALL");
    setSearch("");
  }

  async function refreshAfterMutation() {
    await loadList("replace");
    await loadMailboxCounts();
    if (selectedId) {
      await loadDetail(selectedId);
    }
  }

  async function postBulk(action: string) {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/communication/inbox/conversations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationIds: [...selectedIds],
          action,
        }),
      });
      if (!res.ok) {
        setActionError("Massenaktion fehlgeschlagen.");
        return;
      }
      setSelectedIds(new Set());
      await refreshAfterMutation();
    } catch {
      setActionError("Massenaktion fehlgeschlagen.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function postOrganization(action: string) {
    if (!selectedId || !canManage) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/communication/inbox/conversations/${selectedId}/organization`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) {
        setActionError("Aktion fehlgeschlagen.");
        return;
      }
      await refreshAfterMutation();
    } catch {
      setActionError("Aktion fehlgeschlagen.");
    } finally {
      setActionBusy(false);
    }
  }

  async function postReadState(markAs: "read" | "unread") {
    if (!selectedId) return;
    setActionBusy(true);
    try {
      await fetch(`/api/communication/inbox/conversations/${selectedId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAs }),
      });
      setConversations((prev) =>
        prev.map((item) =>
          item.id === selectedId ? { ...item, unread: markAs === "unread" } : item,
        ),
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function toggleStar(conversationId: string, starred: boolean) {
    await fetch(`/api/communication/inbox/conversations/${conversationId}/star`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred }),
    });
    setConversations((prev) =>
      prev.map((item) => (item.id === conversationId ? { ...item, starred } : item)),
    );
    if (mailbox === "STARRED" && !starred) {
      setConversations((prev) => prev.filter((item) => item.id !== conversationId));
    }
    void loadMailboxCounts();
  }

  async function sendReply() {
    if (!selectedId || !replyText.trim() || !canReply) return;
    setReplySubmitting(true);
    setReplyError(null);
    try {
      const idempotencyKey = `reply:${selectedId}:${Date.now()}`;
      const res = await fetch(`/api/communication/inbox/conversations/${selectedId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyText: replyText, idempotencyKey }),
      });
      if (!res.ok) {
        setReplyError("Antwort konnte nicht gesendet werden.");
        return;
      }
      setReplyText("");
      await refreshAfterMutation();
    } catch {
      setReplyError("Antwort konnte nicht gesendet werden.");
    } finally {
      setReplySubmitting(false);
    }
  }

  async function updateStatus(status: "OPEN" | "RESOLVED") {
    if (!selectedId || !canManage) return;
    setActionError(null);
    const res = await fetch(`/api/communication/inbox/conversations/${selectedId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setActionError("Status konnte nicht aktualisiert werden.");
      return;
    }
    await refreshAfterMutation();
  }

  async function updateAssignment(assignedToUserId: string | null) {
    if (!selectedId || !canManage) return;
    setActionError(null);
    const res = await fetch(`/api/communication/inbox/conversations/${selectedId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToUserId }),
    });
    if (!res.ok) {
      setActionError("Zuweisung konnte nicht aktualisiert werden.");
      return;
    }
    await refreshAfterMutation();
  }

  const capabilities: CommunicationInboxCapabilities = {
    currentUserId,
    canReply,
    canManage,
    canSettings: false,
  };

  const isTrashed =
    selectedConversation?.mailboxOrganization === "TRASHED" ||
    detail?.mailboxOrganization === "TRASHED";

  return (
    <div
      className="flex min-h-[min(720px,calc(100dvh-15rem))] max-h-[calc(100dvh-12rem)] flex-col gap-4"
      data-communication-inbox-workspace
    >
      <CommunicationInboxToolbar
        mailbox={mailbox}
        onMailboxChange={(next) => {
          setMailbox(next);
          setSelectedId(null);
          setMobilePane("list");
        }}
        mailboxCounts={mailboxCounts}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        onResetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        layout={workspacePreference.layout}
        density={workspacePreference.density}
        onLayoutChange={setWorkspaceLayout}
        onDensityChange={setWorkspaceDensity}
        onResetViewDefaults={resetViewDefaults}
        viewPersistError={viewPersistError}
      />

      <CommunicationInboxWorkspaceLayout
        layout={workspacePreference.layout}
        listSplitPercent={workspacePreference.listSplitPercent}
        onListSplitPercentChange={setListSplitPercent}
        onSplitPersist={persistListSplitPercent}
        mobilePane={mobilePane}
        selectedId={selectedId}
        list={
        <CommunicationInboxConversationList
          mailbox={mailbox}
          conversations={conversations}
          selectedId={selectedId}
          selectedIds={selectedIds}
          currentUserId={currentUserId}
          canManage={canManage}
          bulkBusy={bulkBusy}
          loading={loadingList}
          listError={listError}
          emptyVariant={emptyVariant ?? "none"}
          mailboxEmptyLabel={MAILBOX_EMPTY_LABELS[mailbox]}
          onSelect={(conversationId) => {
            setSelectedId(conversationId);
            setMobilePane("detail");
          }}
          onToggleSelected={(conversationId, checked) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(conversationId);
              else next.delete(conversationId);
              return next;
            });
          }}
          onToggleStar={(conversationId, starred) => void toggleStar(conversationId, starred)}
          onSelectAll={(checked) => {
            if (checked) {
              setSelectedIds(new Set(conversations.map((c) => c.id)));
            } else {
              setSelectedIds(new Set());
            }
          }}
          onResetFilters={resetFilters}
          onBulkArchive={() => void postBulk("ARCHIVE")}
          onBulkRestoreToInbox={() => void postBulk("RESTORE_TO_INBOX")}
          onBulkTrash={() => void postBulk("TRASH")}
          onBulkRestoreFromTrash={() => void postBulk("RESTORE_FROM_TRASH")}
          onBulkMarkRead={() => void postBulk("MARK_READ")}
          onBulkMarkUnread={() => void postBulk("MARK_UNREAD")}
          onBulkStar={() => void postBulk("STAR")}
          onBulkUnstar={() => void postBulk("UNSTAR")}
          onClearSelection={() => setSelectedIds(new Set())}
          visible
          density={workspacePreference.density}
          nextCursor={nextCursor}
          onLoadMore={() => void loadList("append", nextCursor)}
          loadingMore={loadingMore}
        />
        }
        detail={
        <CommunicationInboxConversationDetailPane
          selectedConversationId={selectedId}
          listItem={selectedConversation}
          detail={detail}
          capabilities={capabilities}
          mailbox={mailbox}
          loading={loadingDetail}
          detailError={detailError}
          actionBusy={actionBusy}
          onRetryDetail={() => {
            if (selectedId) {
              void loadDetail(selectedId);
            }
          }}
          replyText={replyText}
          onReplyTextChange={setReplyText}
          onSendReply={() => void sendReply()}
          replySubmitting={replySubmitting}
          replyError={replyError}
          actionError={actionError}
          replyDisabled={isTrashed || repliesLockedInformOnly}
          repliesLockedInformOnly={repliesLockedInformOnly}
          onBackToList={() => setMobilePane("list")}
          showDesktopBackButton={inboxLayoutIsMasterDetailOnDesktop(workspacePreference.layout)}
          onResolve={() => void updateStatus("RESOLVED")}
          onReopen={() => void updateStatus("OPEN")}
          onAssignToMe={() => void updateAssignment(currentUserId)}
          onUnassign={() => void updateAssignment(null)}
          onToggleStar={() => {
            if (!selectedId || !selectedConversation) return;
            void toggleStar(selectedId, !selectedConversation.starred);
          }}
          onArchive={() => void postOrganization("ARCHIVE")}
          onRestoreToInbox={() => void postOrganization("RESTORE_TO_INBOX")}
          onTrash={() => void postOrganization("TRASH")}
          onRestoreFromTrash={() => void postOrganization("RESTORE_FROM_TRASH")}
          onMarkRead={() => void postReadState("read")}
          onMarkUnread={() => void postReadState("unread")}
          showProcessingToolbar={selectedIds.size === 0}
          visible
          hasAnyConversations={conversations.length > 0}
        />
        }
      />
    </div>
  );
}
