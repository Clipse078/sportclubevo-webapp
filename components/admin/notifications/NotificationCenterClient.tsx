"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import type { NotificationListItem } from "@/lib/notifications/read-service";
import { notificationListIcon } from "@/lib/notifications/notification-presentation";
import { Button } from "@/components/ui/Button";

type Props = {
  items: NotificationListItem[];
  filter: "ALL" | "UNREAD";
  page: number;
  pageCount: number;
  totalCount: number;
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationCenterClient({
  items,
  filter,
  page,
  pageCount,
  totalCount,
}: Props) {
  const router = useRouter();

  async function markRead(id: string, read: boolean) {
    await fetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    router.refresh();
  }

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    router.refresh();
  }

  const emptyMessage =
    filter === "UNREAD"
      ? "Alles erledigt – keine ungelesenen Benachrichtigungen."
      : "Keine Benachrichtigungen vorhanden";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5">
          <Link
            href="/dashboard/notifications?view=all"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              filter === "ALL"
                ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            Alle
          </Link>
          <Link
            href="/dashboard/notifications?view=unread"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              filter === "UNREAD"
                ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]",
            )}
          >
            Ungelesen
          </Link>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void markAllRead()}>
          Alle als gelesen markieren
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--muted)]">
          {emptyMessage}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
          {items.map((item) => {
            const { Icon, className } = notificationListIcon({
              category: item.category,
              type: item.type,
            });
            return (
            <li key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)]",
                    className,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={item.href} className="text-sm font-semibold text-[var(--foreground)] hover:underline">
                      {item.title}
                    </Link>
                    {item.unread ? (
                      <span className="rounded-full bg-[var(--sce-primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sce-primary)]">
                        Ungelesen
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-[var(--text-2)]">{item.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{formatTimestamp(item.createdAt)}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2 sm:pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void markRead(item.id, !item.unread)}
                >
                  {item.unread ? "Als gelesen" : "Als ungelesen"}
                </Button>
              </div>
            </li>
          );
          })}
        </ul>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>
            Seite {page} von {pageCount} ({totalCount} gesamt)
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/dashboard/notifications?view=${filter === "UNREAD" ? "unread" : "all"}&page=${page - 1}`}
                className="text-[var(--sce-primary)] hover:underline"
              >
                Zurück
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link
                href={`/dashboard/notifications?view=${filter === "UNREAD" ? "unread" : "all"}&page=${page + 1}`}
                className="text-[var(--sce-primary)] hover:underline"
              >
                Weiter
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
