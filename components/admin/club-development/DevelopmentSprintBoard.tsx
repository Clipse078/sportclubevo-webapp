"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { TaskStatus } from "@prisma/client";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import { getTaskPriorityVisual } from "@/lib/tasks/task-priority-visual";

type BoardCard = {
  taskId: string;
  title: string;
  status: TaskStatus;
  column: "OPEN" | "IN_PROGRESS" | "DONE";
  priority: string;
  dueAt: string | null;
  assignees: { userId: string; displayName: string }[];
  initiativeLabel: string | null;
};

type BoardState = {
  OPEN: BoardCard[];
  IN_PROGRESS: BoardCard[];
  DONE: BoardCard[];
};

const COLUMNS: { key: keyof BoardState; label: string }[] = [
  { key: "OPEN", label: "Offen" },
  { key: "IN_PROGRESS", label: "In Arbeit" },
  { key: "DONE", label: "Erledigt" },
];

const COLUMN_ACTIONS: Record<
  keyof BoardState,
  { label: string; status: TaskStatus }[]
> = {
  OPEN: [{ label: "In Arbeit", status: TaskStatus.IN_PROGRESS }],
  IN_PROGRESS: [
    { label: "Offen", status: TaskStatus.OPEN },
    { label: "Erledigt", status: TaskStatus.DONE },
  ],
  DONE: [{ label: "Wieder öffnen", status: TaskStatus.OPEN }],
};

type Props = {
  sprintId: string;
  sprintTitle: string;
};

function formatDue(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

export default function DevelopmentSprintBoard({ sprintId, sprintTitle }: Props) {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadBoard = useCallback(() => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`/api/club-development/sprints/${sprintId}/board`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Board konnte nicht geladen werden.");
          setBoard(null);
          return;
        }
        setBoard({
          OPEN: data.columns?.OPEN ?? [],
          IN_PROGRESS: data.columns?.IN_PROGRESS ?? [],
          DONE: data.columns?.DONE ?? [],
        });
      } catch {
        setError("Netzwerkfehler beim Laden des Boards.");
        setBoard(null);
      }
    });
  }, [sprintId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const moveCard = (taskId: string, status: TaskStatus) => {
    startTransition(async () => {
      const res = await fetch(`/api/club-development/sprints/${sprintId}/board/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Status konnte nicht geändert werden.");
        return;
      }
      loadBoard();
    });
  };

  if (error && !board) {
    return <BoardErrorState message={error} onRetry={loadBoard} />;
  }

  if (!board && pending) {
    return (
      <BoardLoadingState>
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
        <p className="text-sm text-[var(--muted)]">Board wird geladen …</p>
      </BoardLoadingState>
    );
  }

  if (!board) return null;

  const totalCards = board.OPEN.length + board.IN_PROGRESS.length + board.DONE.length;

  return (
    <div className="space-y-4" data-testid="development-sprint-board">
      <p className="text-sm text-[var(--text-2)]">
        Sprint: <span className="font-semibold text-[var(--foreground)]">{sprintTitle}</span>
      </p>
      {error ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">{error}</p>
      ) : null}
      {totalCards === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-12 text-center text-sm text-[var(--muted)]">
          Keine Aufgaben in diesem Sprint.
        </div>
      ) : (
        <BoardColumnsGrid board={board} pending={pending} onMove={moveCard} />
      )}
    </div>
  );
}

function BoardCardView({
  card,
  columnKey,
  pending,
  onMove,
}: {
  card: BoardCard;
  columnKey: keyof BoardState;
  pending: boolean;
  onMove: (taskId: string, status: TaskStatus) => void;
}) {
  const priorityVisual = getTaskPriorityVisual(card.priority as Parameters<typeof getTaskPriorityVisual>[0]);
  const due = formatDue(card.dueAt);
  const actions = COLUMN_ACTIONS[columnKey];

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <Link href={taskWorkspaceHref(card.taskId)} className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--sce-primary)]">
        {card.title}
      </Link>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {priorityVisual.label}
        {due ? ` · Fällig ${due}` : ""}
      </p>
      {card.initiativeLabel ? (
        <p className="mt-1 text-xs text-[var(--text-2)]">Initiative: {card.initiativeLabel}</p>
      ) : null}
      {card.assignees.length > 0 ? (
        <p className="mt-1 text-xs text-[var(--muted)]">
          {card.assignees.map((a) => a.displayName).join(", ")}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={pending}
            onClick={() => onMove(card.taskId, action.status)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-medium text-[var(--sce-primary)] hover:bg-[var(--surface)] disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
    </article>
  );
}

function BoardColumnsGrid({
  board,
  pending,
  onMove,
}: {
  board: BoardState;
  pending: boolean;
  onMove: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {COLUMNS.map((col) => (
        <section
          key={col.key}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3"
          aria-label={col.label}
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{col.label}</h2>
          <div className="space-y-2">
            {board[col.key].length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--muted)]">Leer</p>
            ) : (
              board[col.key].map((card) => (
                <BoardCardView key={card.taskId} card={card} columnKey={col.key} pending={pending} onMove={onMove} />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function BoardErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-8 text-center">
      <p className="text-sm text-red-100">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)]"
      >
        Erneut laden
      </button>
    </div>
  );
}

function BoardLoadingState({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-2 py-16">{children}</div>;
}
