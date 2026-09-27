"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Inbox, Mail, Settings2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { SCE_SURFACE_STANDARD_PANEL } from "@/lib/shell/sce-surface-system";
import { cn } from "@/lib/cn";

type ConversationListItem = {
  id: string;
  subject: string | null;
  previewText: string | null;
  status: string;
  lastMessageAt: string;
  assignedToUserId: string | null;
  unread: boolean;
};

type ConversationDetail = {
  id: string;
  subject: string | null;
  status: string;
  messages: Array<{
    id: string;
    direction: string;
    status: string;
    fromAddress: string | null;
    bodyText: string | null;
    bodyHtmlSanitized: string | null;
    sentAt: string | null;
    receivedAt: string | null;
    deliveryError: string | null;
  }>;
};

const FILTERS = [
  { id: "ALL", label: "Alle" },
  { id: "UNREAD", label: "Ungelesen" },
  { id: "ASSIGNED_TO_ME", label: "Mir zugewiesen" },
  { id: "UNASSIGNED", label: "Nicht zugewiesen" },
  { id: "EMAIL", label: "E-Mail" },
] as const;

export default function CommunicationInboxWorkspace() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("ALL");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/communication/inbox/conversations?${params.toString()}`);
      const data = (await res.json()) as { items?: ConversationListItem[] };
      setConversations(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  const loadDetail = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/communication/inbox/conversations/${conversationId}`);
    const data = (await res.json()) as { conversation?: ConversationDetail };
    setDetail(data.conversation ?? null);
    await fetch(`/api/communication/inbox/conversations/${conversationId}/read`, {
      method: "POST",
    });
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  async function sendReply() {
    if (!selectedId || !replyText.trim()) return;
    const idempotencyKey = `reply:${selectedId}:${Date.now()}`;
    await fetch(`/api/communication/inbox/conversations/${selectedId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyText: replyText, idempotencyKey }),
    });
    setReplyText("");
    await loadDetail(selectedId);
    await loadList();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                filter === item.id
                  ? "border-[var(--sce-primary)] bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "border-[var(--border)] text-[var(--text-2)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Link
          href="/dashboard/communication/inbox/settings"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--sce-primary)]"
        >
          <Settings2 className="h-4 w-4" />
          Postfach-Einstellungen
        </Link>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onBlur={() => void loadList()}
        placeholder="Suche (Betreff, Absender, Text)"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />

      <div className="grid min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,280px)_minmax(280px,360px)_1fr]">
        <aside
          className={cn(
            SCE_SURFACE_STANDARD_PANEL,
            "p-3",
            mobilePane === "list" ? "block" : "hidden lg:block",
          )}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-2)]">
            <Inbox className="h-4 w-4" />
            Filter
          </div>
          <p className="text-xs text-[var(--text-2)]">
            Postfächer werden in den Einstellungen verwaltet.
          </p>
        </aside>

        <section
          className={cn(
            SCE_SURFACE_STANDARD_PANEL,
            mobilePane === "list" ? "block" : "hidden lg:block",
          )}
        >
          <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
            Konversationen {loading ? "…" : `(${conversations.length})`}
          </div>
          <ul className="max-h-[480px] divide-y divide-[var(--border)] overflow-y-auto">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={`w-full px-4 py-3 text-left hover:bg-[var(--surface-2)] ${
                    selectedId === conversation.id ? "bg-[var(--surface-2)]" : ""
                  }`}
                  onClick={() => {
                    setSelectedId(conversation.id);
                    setMobilePane("detail");
                  }}
                >
                  <div className="flex items-center gap-2">
                    {conversation.unread ? (
                      <span className="h-2 w-2 rounded-full bg-[var(--sce-primary)]" />
                    ) : null}
                    <span className="truncate text-sm font-medium">
                      {conversation.subject ?? "(Kein Betreff)"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--text-2)]">
                    {conversation.previewText}
                  </p>
                </button>
              </li>
            ))}
            {conversations.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[var(--text-2)]">
                Noch keine Konversationen importiert.
              </li>
            ) : null}
          </ul>
        </section>

        <section
          className={cn(
            SCE_SURFACE_STANDARD_PANEL,
            mobilePane === "detail" ? "block" : "hidden lg:block",
          )}
        >
          {!selectedConversation || !detail ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[var(--text-2)]">
              <Mail className="h-8 w-8 text-[var(--text-2)]" />
              Wählen Sie eine Konversation aus der Liste.
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{detail.subject ?? "(Kein Betreff)"}</h3>
                  <button
                    type="button"
                    className="text-xs text-[var(--sce-primary)] lg:hidden"
                    onClick={() => setMobilePane("list")}
                  >
                    Zurück
                  </button>
                </div>
                <p className="mt-1 text-xs text-[var(--text-2)]">Status: {detail.status}</p>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {detail.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      message.direction === "OUTBOUND"
                        ? "border-[var(--sce-primary)]/30 bg-[var(--surface-2)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <div className="text-xs text-[var(--text-2)]">
                      {message.direction === "OUTBOUND" ? "Ausgehend" : "Eingehend"}
                      {message.fromAddress ? ` · ${message.fromAddress}` : ""}
                      {message.status === "FAILED" ? " · Fehlgeschlagen" : ""}
                    </div>
                    {message.bodyHtmlSanitized ? (
                      <div
                        className="prose prose-sm mt-2 max-w-none"
                        dangerouslySetInnerHTML={{ __html: message.bodyHtmlSanitized }}
                      />
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap">{message.bodyText}</p>
                    )}
                    {message.deliveryError ? (
                      <p className="mt-2 text-xs text-red-600">{message.deliveryError}</p>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className="border-t border-[var(--border)] p-4">
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  rows={4}
                  placeholder="Antwort verfassen…"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
                <div className="mt-2 flex justify-end">
                  <Button type="button" onClick={() => void sendReply()} disabled={!replyText.trim()}>
                    Antwort senden
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
