"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MoreHorizontal } from "lucide-react";
import { formatDateTimeCompact } from "@/lib/tenant-runtime/formatters";
import type { TaskTimelineEntryDto } from "@/lib/tasks/task-timeline-types";
import { parseTaskCommentAnchorFromHash } from "@/lib/tasks/task-navigation";
import { CoordinatorAvatar } from "@/components/admin/registrations/WaitingListCoordinatorPicker";
import {
  createTaskCommentAction,
  deleteTaskCommentAction,
  loadTaskTimelineAction,
  updateTaskCommentAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";
import { TaskCommentComposer } from "./TaskCommentComposer";
import { TaskCommentBody } from "./TaskCommentBody";

type Props = {
  taskId: string;
  currentUserId: string;
  canCollaborate: boolean;
  locale: string;
  timeZone: string;
};

function timelineEntryKey(entry: TaskTimelineEntryDto): string {
  return entry.id;
}

function CommentActionsMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
        aria-label="Kommentar-Aktionen"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-[80] mt-1 min-w-[140px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Löschen
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TimelineEntryItem({
  taskId,
  entry,
  currentUserId,
  canCollaborate,
  locale,
  timeZone,
  onEditComment,
  onDeleteComment,
}: {
  taskId: string;
  entry: TaskTimelineEntryDto;
  currentUserId: string;
  canCollaborate: boolean;
  locale: string;
  timeZone: string;
  onEditComment: (
    commentId: string,
    body: string,
    mentionedUserIds: string[],
  ) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const commentId = entry.kind === "COMMENT" ? entry.id.replace(/^comment:/, "") : null;
  const isAuthor = commentId && entry.actor.userId === currentUserId;
  const showActions = canCollaborate && isAuthor && !entry.isDeleted && entry.kind === "COMMENT";

  return (
    <article
      id={entry.commentAnchorId ?? undefined}
      className="border-b border-[var(--border)]/60 py-3 last:border-b-0 scroll-mt-24"
      data-testid={`task-timeline-entry-${entry.id}`}
    >
      <div className="flex items-start gap-3">
        <CoordinatorAvatar name={entry.actor.displayName} compact />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                {entry.actor.displayName}
              </p>
              <p className="text-[0.7rem] text-[var(--muted)]">
                {formatDateTimeCompact(entry.occurredAt, { locale, timezone: timeZone })}
                {entry.isEdited ? " · Bearbeitet" : ""}
              </p>
            </div>
            {showActions && !editing ? (
              <CommentActionsMenu
                onEdit={() => setEditing(true)}
                onDelete={() => {
                  if (commentId && window.confirm("Kommentar wirklich löschen?")) {
                    void onDeleteComment(commentId);
                  }
                }}
              />
            ) : null}
          </div>

          <div className="mt-1.5 text-sm text-[var(--foreground)]">
            {entry.kind === "AUDIT" ? (
              <div className="space-y-1">
                <p>{entry.title}</p>
                {entry.details.map((line) => (
                  <p key={line} className="text-xs text-[var(--muted)]">
                    {line}
                  </p>
                ))}
              </div>
            ) : entry.isDeleted ? (
              <p className="italic text-[var(--muted)]">Kommentar gelöscht</p>
            ) : editing ? (
              <TaskCommentComposer
                taskId={taskId}
                initialBody={entry.body ?? ""}
                initialMentionedUserIds={entry.mentions.map((m) => m.userId)}
                submitLabel="Speichern"
                onCancel={() => setEditing(false)}
                onSubmit={async (payload) => {
                  if (!commentId) return;
                  await onEditComment(commentId, payload.body, payload.mentionedUserIds);
                  setEditing(false);
                }}
              />
            ) : entry.body ? (
              <TaskCommentBody body={entry.body} mentions={entry.mentions} />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Remounts client timeline state when `taskId` changes (full page or intercept modal). */
export function TaskActivitySection(props: Props) {
  return <TaskActivitySectionBody key={props.taskId} {...props} />;
}

function TaskActivitySectionBody({
  taskId,
  currentUserId,
  canCollaborate,
  locale,
  timeZone,
}: Props) {
  const [entries, setEntries] = useState<TaskTimelineEntryDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const anchorCommentId =
      typeof window !== "undefined"
        ? parseTaskCommentAnchorFromHash(window.location.hash)
        : null;

    void loadTaskTimelineAction(taskId, null, anchorCommentId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setEntries([]);
        setLoading(false);
        return;
      }
      const chronological = [...result.page.entries].reverse();
      setEntries(chronological);
      setNextCursor(result.page.nextCursor);
      setHasMore(result.page.hasMore);
      setLoading(false);

      if (anchorCommentId) {
        requestAnimationFrame(() => {
          document.getElementById(`comment-${anchorCommentId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const refreshTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadTaskTimelineAction(taskId);
    if (!result.ok) {
      setError(result.message);
      setEntries([]);
      setLoading(false);
      return;
    }
    const chronological = [...result.page.entries].reverse();
    setEntries(chronological);
    setNextCursor(result.page.nextCursor);
    setHasMore(result.page.hasMore);
    setLoading(false);
  }, [taskId]);

  async function loadOlder() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    const result = await loadTaskTimelineAction(taskId, nextCursor);
    if (!result.ok) {
      setError(result.message);
      setLoadingMore(false);
      return;
    }
    const olderChronological = [...result.page.entries].reverse();
    setEntries((prev) => [...olderChronological, ...prev]);
    setNextCursor(result.page.nextCursor);
    setHasMore(result.page.hasMore);
    setLoadingMore(false);
  }

  async function handleCreate(payload: { body: string; mentionedUserIds: string[] }) {
    const result = await createTaskCommentAction(taskId, payload.body, payload.mentionedUserIds);
    if (!result.ok) {
      throw new Error(result.message);
    }
    await refreshTimeline();
  }

  async function handleEdit(
    commentId: string,
    body: string,
    mentionedUserIds: string[],
  ) {
    const result = await updateTaskCommentAction(taskId, commentId, body, mentionedUserIds);
    if (!result.ok) {
      throw new Error(result.message);
    }
    await refreshTimeline();
  }

  async function handleDelete(commentId: string) {
    const result = await deleteTaskCommentAction(taskId, commentId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    await refreshTimeline();
  }

  return (
    <section className="rounded-lg border border-[var(--border)]/60 px-3 py-4" data-testid="task-activity-section">
      <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Aktivität</h2>

      {canCollaborate ? (
        <div className="mb-4">
          <TaskCommentComposer taskId={taskId} onSubmit={handleCreate} />
        </div>
      ) : null}

      {error ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}

      {hasMore ? (
        <div className="mb-3">
          <button
            type="button"
            className="text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
            disabled={loadingMore}
            onClick={() => void loadOlder()}
            data-testid="task-timeline-load-older"
          >
            {loadingMore ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Lädt…
              </span>
            ) : (
              "Ältere laden"
            )}
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Aktivität wird geladen…
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Noch keine Aktivität.</p>
      ) : (
        <div data-testid="task-timeline-list">
          {entries.map((entry) => (
            <TimelineEntryItem
              key={timelineEntryKey(entry)}
              taskId={taskId}
              entry={entry}
              currentUserId={currentUserId}
              canCollaborate={canCollaborate}
              locale={locale}
              timeZone={timeZone}
              onEditComment={handleEdit}
              onDeleteComment={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
