"use client";

import { GripVertical, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { taskPriorityVisual } from "@/lib/tasks/task-priority-visual";
import SprintTaskAssigneeDisplay from "./SprintTaskAssigneeDisplay";
import SprintTaskTitleLink from "./SprintTaskTitleLink";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import {
  EMPTY_BOARD_FILTERS,
  filterSprintBoardCards,
  groupBoardCardsByInitiative,
  isTaskOverdue,
  type SprintBoardFilterState,
} from "@/lib/club-development/sprints/sprint-board-filters";
import type { SprintBoardCard, SprintBoardColumnKey } from "@/lib/club-development/sprints/sprint-board";
import SprintInlineTaskCreate from "./SprintInlineTaskCreate";
import { SceCheckbox } from "@/components/sce/forms/SceCheckbox";

type BoardState = {
  OPEN: SprintBoardCard[];
  IN_PROGRESS: SprintBoardCard[];
  DONE: SprintBoardCard[];
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

const VALID_DND: Record<keyof BoardState, TaskStatus[]> = {
  OPEN: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS],
  IN_PROGRESS: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.DONE],
  DONE: [TaskStatus.DONE, TaskStatus.OPEN],
};

type Props = {
  sprintId: string;
  sprintTitle: string;
  canManage: boolean;
  currentUserId: string | null;
};

function formatDue(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

export default function DevelopmentSprintBoard({ sprintId, sprintTitle, canManage, currentUserId }: Props) {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<SprintBoardFilterState>(EMPTY_BOARD_FILTERS);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const loadBoard = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const result = await clubDevelopmentFetchJson<{ columns?: BoardState; error?: string }>(
        `/api/club-development/sprints/${sprintId}/board`,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setBoard({
        OPEN: result.data.columns?.OPEN ?? [],
        IN_PROGRESS: result.data.columns?.IN_PROGRESS ?? [],
        DONE: result.data.columns?.DONE ?? [],
      });
    });
  }, [sprintId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") {
        loadBoard();
      }
    };
  const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) loadBoard();
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [loadBoard]);

  const allCards = useMemo(() => {
    if (!board) return [];
    return [...board.OPEN, ...board.IN_PROGRESS, ...board.DONE];
  }, [board]);

  const initiativeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const card of allCards) {
      if (card.initiativeId && card.initiativeLabel) map.set(card.initiativeId, card.initiativeLabel);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [allCards]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const card of allCards) {
      for (const a of card.assignees) map.set(a.userId, a.displayName);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [allCards]);

  const filteredByColumn = useMemo(() => {
    if (!board) return null;
    const next: BoardState = { OPEN: [], IN_PROGRESS: [], DONE: [] };
    for (const col of COLUMNS) {
      next[col.key] = filterSprintBoardCards(board[col.key], filters, currentUserId);
    }
    return next;
  }, [board, filters, currentUserId]);

  const moveCard = (taskId: string, status: TaskStatus) => {
    const previous = board;
    startTransition(async () => {
      if (board) {
        setBoard(optimisticMove(board, taskId, status));
      }
      const res = await fetch(`/api/club-development/sprints/${sprintId}/board/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Status konnte nicht geändert werden.");
        if (previous) setBoard(previous);
        return;
      }
      loadBoard();
    });
  };

  const onDropToColumn = (columnKey: keyof BoardState, taskId: string) => {
    const card = allCards.find((c) => c.taskId === taskId);
    if (!card) return;
    const targetStatus =
      columnKey === "DONE"
        ? TaskStatus.DONE
        : columnKey === "IN_PROGRESS"
          ? TaskStatus.IN_PROGRESS
          : TaskStatus.OPEN;
    if (!VALID_DND[columnKey].includes(card.status) && card.status !== targetStatus) {
      moveCard(taskId, targetStatus);
      return;
    }
    if (card.status !== targetStatus) moveCard(taskId, targetStatus);
  };

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.mineOnly ||
    Boolean(filters.assigneeUserId) ||
    Boolean(filters.initiativeId) ||
    filters.groupByInitiative;

  if (error && !board) {
    return <BoardErrorState message={error} onRetry={loadBoard} />;
  }

  if (!board && pending) {
    return (
      <BoardLoadingState>
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
        <p className="text-sm text-[var(--muted)]">Aufgabenboard wird geladen …</p>
      </BoardLoadingState>
    );
  }

  if (!board || !filteredByColumn) return null;

  const totalCards = board.OPEN.length + board.IN_PROGRESS.length + board.DONE.length;
  const filteredTotal =
    filteredByColumn.OPEN.length + filteredByColumn.IN_PROGRESS.length + filteredByColumn.DONE.length;

  return (
    <div className="space-y-4" data-testid="development-sprint-board">
      <p className="text-sm text-[var(--text-2)]">
        Aufgabenboard: <span className="font-semibold text-[var(--foreground)]">{sprintTitle}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted)]" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Aufgaben suchen …"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <SceCheckbox
            checked={filters.mineOnly}
            onChange={(e) => setFilters((f) => ({ ...f, mineOnly: e.target.checked }))}
          />
          Meine Aufgaben
        </label>
        <select
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
          value={filters.assigneeUserId ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, assigneeUserId: e.target.value || null }))}
        >
          <option value="">Alle Verantwortlichen</option>
          {assigneeOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm"
          value={filters.initiativeId ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, initiativeId: e.target.value || null }))}
        >
          <option value="">Alle Vorhaben</option>
          <option value="none">Ohne Vorhaben</option>
          {initiativeOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm">
          <SceCheckbox
            checked={filters.groupByInitiative}
            onChange={(e) => setFilters((f) => ({ ...f, groupByInitiative: e.target.checked }))}
          />
          Nach Vorhaben gruppieren
        </label>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => setFilters(EMPTY_BOARD_FILTERS)}
            className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
          >
            Filter zurücksetzen
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">{error}</p>
      ) : null}

      {totalCards === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-12 text-center text-sm text-[var(--muted)]">
          Keine Aufgaben in dieser Umsetzungsphase.
          {canManage ? (
            <div className="mx-auto mt-4 max-w-md text-left">
              <SprintInlineTaskCreate sprintId={sprintId} onCreated={loadBoard} />
            </div>
          ) : null}
        </div>
      ) : filteredTotal === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-12 text-center text-sm text-[var(--muted)]">
          Keine Aufgaben passen zu den aktuellen Filtern.
        </div>
      ) : (
        <BoardColumnsGrid
          board={filteredByColumn}
          fullBoard={board}
          pending={pending}
          filters={filters}
          draggingId={draggingId}
          canManage={canManage}
          sprintId={sprintId}
          onMove={moveCard}
          onDragStart={setDraggingId}
          onDragEnd={() => setDraggingId(null)}
          onDropToColumn={onDropToColumn}
          onRefresh={loadBoard}
        />
      )}
    </div>
  );
}

function optimisticMove(board: BoardState, taskId: string, status: TaskStatus): BoardState {
  const card = [...board.OPEN, ...board.IN_PROGRESS, ...board.DONE].find((c) => c.taskId === taskId);
  if (!card) return board;
  const next: BoardState = {
    OPEN: board.OPEN.filter((c) => c.taskId !== taskId),
    IN_PROGRESS: board.IN_PROGRESS.filter((c) => c.taskId !== taskId),
    DONE: board.DONE.filter((c) => c.taskId !== taskId),
  };
  const column: SprintBoardColumnKey =
    status === TaskStatus.DONE ? "DONE" : status === TaskStatus.IN_PROGRESS ? "IN_PROGRESS" : "OPEN";
  const updated = { ...card, status, column };
  if (updated.column === "DONE") next.DONE.push(updated);
  else if (updated.column === "IN_PROGRESS") next.IN_PROGRESS.push(updated);
  else next.OPEN.push(updated);
  return next;
}

function BoardCardView({
  card,
  columnKey,
  pending,
  onMove,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  card: SprintBoardCard;
  columnKey: keyof BoardState;
  pending: boolean;
  onMove: (taskId: string, status: TaskStatus) => void;
  draggable: boolean;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
}) {
  const priorityVisual = taskPriorityVisual(card.priority as TaskPriority);
  const due = formatDue(card.dueAt);
  const overdue = isTaskOverdue(card.dueAt);
  const actions = COLUMN_ACTIONS[columnKey];

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <div className="flex items-start gap-2">
        {draggable ? (
          <button
            type="button"
            aria-label={`${card.title} verschieben`}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("text/task-id", card.taskId);
              event.dataTransfer.effectAllowed = "move";
              onDragStart(card.taskId);
            }}
            onDragEnd={onDragEnd}
            className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-[var(--muted)] active:cursor-grabbing hover:bg-[var(--surface-2)]"
            data-testid={`sprint-board-drag-handle-${card.taskId}`}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <span className="w-5 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <SprintTaskTitleLink taskId={card.taskId} title={card.title} className="min-w-0 flex-1" />
            <span className="shrink-0 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              {priorityVisual.label}
            </span>
          </div>
      {due ? (
        <p className={`mt-1 text-xs ${overdue ? "font-medium text-red-600" : "text-[var(--muted)]"}`}>
          Fällig {due}
          {overdue ? " · überfällig" : ""}
        </p>
      ) : null}
          {card.initiativeLabel ? (
            <p className="mt-1 text-xs text-[var(--text-2)]">{card.initiativeLabel}</p>
          ) : null}
          <SprintTaskAssigneeDisplay assignees={card.assignees} className="mt-2" compact />
        </div>
      </div>
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
  fullBoard,
  pending,
  filters,
  draggingId,
  canManage,
  sprintId,
  onMove,
  onDragStart,
  onDragEnd,
  onDropToColumn,
  onRefresh,
}: {
  board: BoardState;
  fullBoard: BoardState;
  pending: boolean;
  filters: SprintBoardFilterState;
  draggingId: string | null;
  canManage: boolean;
  sprintId: string;
  onMove: (taskId: string, status: TaskStatus) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onDropToColumn: (column: keyof BoardState, taskId: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const cards = board[col.key];
        const fullCount = fullBoard[col.key].length;
        const swimlanes = filters.groupByInitiative ? groupBoardCardsByInitiative(cards) : null;

        return (
          <section
            key={col.key}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3"
            aria-label={col.label}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = draggingId ?? e.dataTransfer.getData("text/task-id");
              if (taskId) onDropToColumn(col.key, taskId);
            }}
          >
            <h2 className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              <span>{col.label}</span>
              <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px]">{fullCount}</span>
            </h2>
            {swimlanes ? (
              <div className="space-y-4">
                {swimlanes.map((lane) => (
                  <div key={lane.key}>
                    <p className="mb-2 text-xs font-medium text-[var(--text-2)]">{lane.label}</p>
                    <CardStack
                      cards={lane.cards}
                      columnKey={col.key}
                      pending={pending}
                      canManage={canManage}
                      onMove={onMove}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <CardStack
                cards={cards}
                columnKey={col.key}
                pending={pending}
                canManage={canManage}
                onMove={onMove}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            )}
            {col.key === "OPEN" && canManage ? (
              <div className="mt-3">
                <SprintInlineTaskCreate sprintId={sprintId} disabled={pending} onCreated={onRefresh} />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function CardStack({
  cards,
  columnKey,
  pending,
  canManage,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  cards: SprintBoardCard[];
  columnKey: keyof BoardState;
  pending: boolean;
  canManage: boolean;
  onMove: (taskId: string, status: TaskStatus) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="space-y-2">
      {cards.length === 0 ? (
        <p className="py-4 text-center text-xs text-[var(--muted)]">Leer</p>
      ) : (
        cards.map((card) => (
          <BoardCardView
            key={card.taskId}
            card={card}
            columnKey={columnKey}
            pending={pending}
            onMove={onMove}
            draggable={canManage}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))
      )}
    </div>
  );
}

function BoardErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-8 text-center">
      <p className="text-sm text-rose-900">{message}</p>
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