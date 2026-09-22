"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell as BellIcon, CheckCheck } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import type { NotificationListItem } from "@/lib/notifications/read-service";
import { notificationListIcon } from "@/lib/notifications/notification-presentation";

type SummaryResponse = {
  unreadCount: number;
  latest: NotificationListItem[];
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationIcon({ item }: { item: NotificationListItem }) {
  const { Icon, className } = notificationListIcon({
    category: item.category,
    type: item.type,
  });
  return (
    <span
      className={cn(
        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]",
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{item.type}</span>
    </span>
  );
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResponse>({ unreadCount: 0, latest: [] });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/summary", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as SummaryResponse;
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    await refresh();
  }

  async function openNotification(item: NotificationListItem) {
    await fetch(`/api/notifications/${item.id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    setOpen(false);
    router.push(item.href);
    void refresh();
  }

  const badge =
    summary.unreadCount > 0 ? (
      <span
        className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sce-primary)] px-1 text-[10px] font-semibold text-white"
        aria-hidden="true"
      >
        {summary.unreadCount > 9 ? "9+" : summary.unreadCount}
      </span>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-md",
          "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        )}
        aria-label={
          summary.unreadCount > 0
            ? `Benachrichtigungen, ${summary.unreadCount} ungelesen`
            : "Benachrichtigungen"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <BellIcon className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
        {badge}
      </button>

      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        matchAnchorWidth={false}
        role="dialog"
        maxHeight={480}
        className="w-[min(24rem,calc(100vw-1.5rem))] p-0"
      >
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Benachrichtigungen</h2>
            {summary.unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sce-primary)] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Alle als gelesen markieren
              </button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
          {loading && summary.latest.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">Laden…</p>
          ) : summary.latest.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">Keine neuen Benachrichtigungen</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {summary.latest.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void openNotification(item)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]",
                      item.unread && "bg-[var(--surface-1)]",
                    )}
                  >
                    <NotificationIcon item={item} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-[var(--foreground)]">{item.title}</span>
                        {item.unread ? (
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--sce-primary)]"
                            aria-label="Ungelesen"
                          />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block whitespace-pre-line text-xs text-[var(--text-2)] line-clamp-2">
                        {item.body}
                      </span>
                      <span className="mt-1 block text-[11px] text-[var(--muted)]">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-4 py-2.5">
          <Link
            href="/dashboard/notifications"
            className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
            onClick={() => setOpen(false)}
          >
            Alle Benachrichtigungen
          </Link>
        </div>
      </PopoverContent>
    </>
  );
}
