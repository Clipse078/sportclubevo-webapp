"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommunicationInboxConversationDetailPane } from "@/components/admin/communication/inbox/CommunicationInboxConversationDetail";
import { CommunicationInboxConversationList } from "@/components/admin/communication/inbox/CommunicationInboxConversationList";
import { CommunicationInboxToolbar } from "@/components/admin/communication/inbox/CommunicationInboxToolbar";
import type {
  CommunicationInboxCapabilities,
  InboxConversationDetail,
  InboxConversationListItem,
  InboxQuickFilterId,
} from "@/components/admin/communication/inbox/inbox-workspace-types";

type CommunicationInboxWorkspaceProps = CommunicationInboxCapabilities;

export default function CommunicationInboxWorkspace({
  currentUserId,
  canReply,
  canManage,
}: CommunicationInboxWorkspaceProps) {
  const [filter, setFilter] = useState<InboxQuickFilterId>("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [conversations, setConversations] = useState<InboxConversationListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InboxConversationDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
  const selectedConversationRef = useRef<string | null>(null);
  selectedConversationRef.current = selectedId;

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const loadList = useCallback(
    async (mode: "replace" | "append" = "replace", cursor?: string | null) => {
      if (mode === "append") {
        setLoadingMore(true);
      } else {
        setLoadingList(true);
      }
      setListError(null);
      try {
        const params = new URLSearchParams({ filter });
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
    [filter, debouncedSearch],
  );

  useEffect(() => {
    void loadList("replace");
  }, [loadList]);

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

  const hasActiveFilters = filter !== "ALL" || debouncedSearch.length > 0;

  const emptyVariant = useMemo(() => {
    if (conversations.length > 0) return null;
    if (debouncedSearch) return "search" as const;
    if (filter !== "ALL") return "filter" as const;
    return "none" as const;
  }, [conversations.length, debouncedSearch, filter]);

  function resetFilters() {
    setFilter("ALL");
    setSearch("");
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
      await loadDetail(selectedId);
      await loadList("replace");
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
    await loadDetail(selectedId);
    await loadList("replace");
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
    await loadDetail(selectedId);
    await loadList("replace");
  }

  const capabilities: CommunicationInboxCapabilities = {
    currentUserId,
    canReply,
    canManage,
    canSettings: false,
  };

  return (
    <div
      className="flex min-h-[min(720px,calc(100dvh-15rem))] max-h-[calc(100dvh-12rem)] flex-col gap-4"
      data-communication-inbox-workspace
    >
      <CommunicationInboxToolbar
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        onResetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <CommunicationInboxConversationList
          conversations={conversations}
          selectedId={selectedId}
          currentUserId={currentUserId}
          loading={loadingList}
          listError={listError}
          emptyVariant={emptyVariant ?? "none"}
          onSelect={(conversationId) => {
            setSelectedId(conversationId);
            setMobilePane("detail");
          }}
          onResetFilters={resetFilters}
          visible={mobilePane === "list"}
          nextCursor={nextCursor}
          onLoadMore={() => void loadList("append", nextCursor)}
          loadingMore={loadingMore}
        />

        <CommunicationInboxConversationDetailPane
          selectedConversationId={selectedId}
          listItem={selectedConversation}
          detail={detail}
          capabilities={capabilities}
          loading={loadingDetail}
          detailError={detailError}
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
          onBackToList={() => setMobilePane("list")}
          onResolve={() => void updateStatus("RESOLVED")}
          onReopen={() => void updateStatus("OPEN")}
          onAssignToMe={() => void updateAssignment(currentUserId)}
          onUnassign={() => void updateAssignment(null)}
          visible={mobilePane === "detail"}
          hasAnyConversations={conversations.length > 0}
        />
      </div>
    </div>
  );
}
