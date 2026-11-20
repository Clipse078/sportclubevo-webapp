"use client";

import { GripVertical, Loader2 } from "lucide-react";
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
import SprintBoardWorkspaceToolbar from "./SprintBoardWorkspaceToolbar";
import {
  SCE_CD_SECTION_BODY_CLASS,
  SCE_CD_SECTION_HEADER_CLASS,
  SCE_CD_SECTION_SHELL_CLASS,
} from "./sce-club-development-surface-styles";
import {
  VEREINSENTWICKLUNG_BOARD_COLUMNS,
  mapTaskStatusToVereinsentwicklungBoardColumn,
} from "@/lib/club-development/vereinsentwicklung-task-status";
import VereinsentwicklungTaskStatusControl from "./VereinsentwicklungTaskStatusControl";

type BoardState = Record<SprintBoardColumnKey, SprintBoardCard[]>;

function emptyBoardState(): BoardState {
  return { OPEN: [], IN_PROGRESS: [], WAITING: [], DONE: [] };
}

function allBoardCards(board: BoardState): SprintBoardCard[] {
  return VEREINSENTWICKLUNG_BOARD_COLUMNS.flatMap((col) => board[col.key]);
}

function statusForBoardColumn(column: SprintBoardColumnKey): TaskStatus {
  switch (column) {
    case "DONE":
      return TaskStatus.DONE;
    case "IN_PROGRESS":
      return TaskStatus.IN_PROGRESS;
    case "WAITING":
      return TaskStatus.WAITING;
    default:
      return TaskStatus.OPEN;
  }
}

type Props = {
  sprintId: string;
  canManage: boolean;
  currentUserId: string | null;
};

function formatDue(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

export default function DevelopmentSprintBoard({ sprintId, canManage, currentUserId }: Props) {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<SprintBoardFilterState>(EMPTY_BOARD_FILTERS);
  const [secondaryFiltersOpen, setSecondaryFiltersOpen] = useState(false);
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
      const columns = result.data.columns;
      setBoard({
        OPEN: columns?.OPEN ?? [],
        IN_PROGRESS: columns?.IN_PROGRESS ?? [],
        WAITING: columns?.WAITING ?? [],
        DONE: columns?.DONE ?? [],
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
    return allBoardCards(board);
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
    const next = emptyBoardState();
    for (const col of VEREINSENTWICKLUNG_BOARD_COLUMNS) {
      next[col.key] = filterSprintBoardCards(board[col.key], filters, currentUserId);
    }
    return next;
  }, [board, filters, currentUserId]);

  const moveCard = (taskId: string, status: TaskStatus) => {
    const previous = board;
    const card = board ? allBoardCards(board).find((c) => c.taskId === taskId) : undefined;
    startTransition(async () => {
      if (board) {
        setBoard(optimisticMove(board, taskId, status));
      }
      const res = await fetch(`/api/club-development/sprints/${sprintId}/board/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, currentStatus: card?.status }),
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

  const onDropToColumn = (columnKey: SprintBoardColumnKey, taskId: string) => {
    if (!canManage) return;
    const card = allCards.find((c) => c.taskId === taskId);
    if (!card) return;
    const targetStatus = statusForBoardColumn(columnKey);
    if (card.status !== targetStatus) moveCard(taskId, targetStatus);
  };

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

  const totalCards = allBoardCards(board).length;
  const filteredTotal = allBoardCards(filteredByColumn).length;

  return (
    <div className="space-y-4" data-testid="development-sprint-board">
      <p className="sr-only">
        Aufgaben nach Status — Karten lassen sich per Ziehen oder über das Status-Menü verschieben.
      </p>

      <SprintBoardWorkspaceToolbar
        filters={filters}
        onFiltersChange={setFilters}
        secondaryFiltersOpen={secondaryFiltersOpen}
        onSecondaryFiltersToggle={() => setSecondaryFiltersOpen((open) => !open)}
        assigneeOptions={assigneeOptions}
        initiativeOptions={initiativeOptions}
      />

      {error ? (
        <p
          className="rounded-md border border-amber-500/30 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="alert"
        >
          {error}
        </p>
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
          onStatusError={setError}
        />
      )}
    </div>
  );
}

function optimisticMove(board: BoardState, taskId: string, status: TaskStatus): BoardState {
  const card = allBoardCards(board).find((c) => c.taskId === taskId);
  if (!card) return board;
  const next = emptyBoardState();
  for (const col of VEREINSENTWICKLUNG_BOARD_COLUMNS) {
    next[col.key] = board[col.key].filter((c) => c.taskId !== taskId);
  }
  const column = mapTaskStatusToVereinsentwicklungBoardColumn(status);
  const updated = { ...card, status, column };
  next[column].push(updated);
  return next;
}

function BoardCardView({
  card,
  pending,
  canManage,
  sprintId,
  onBoardRefresh,
  onStatusError,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  card: SprintBoardCard;
  pending: boolean;
  canManage: boolean;
  sprintId: string;
  onBoardRefresh: () => void;
  onStatusError: (message: string) => void;
  draggable: boolean;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
}) {
  const priorityVisual = taskPriorityVisual(card.priority as TaskPriority);
  const due = formatDue(card.dueAt);
  const overdue = isTaskOverdue(card.dueAt);
  const patchUrl = `/api/club-development/sprints/${encodeURIComponent(sprintId)}/board/tasks/${encodeURIComponent(card.taskId)}/status`;

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
      <div className="mt-3">
        <VereinsentwicklungTaskStatusControl
          taskId={card.taskId}
          status={card.status}
          canEdit={canManage}
          disabled={pending}
          patchUrl={patchUrl}
          onUpdated={() => onBoardRefresh()}
          onError={onStatusError}
          fieldLabel={`Status für ${card.title}`}
        />
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
  onStatusError,
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
  onDropToColumn: (column: SprintBoardColumnKey, taskId: string) => void;
  onRefresh: () => void;
  onStatusError: (message: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {VEREINSENTWICKLUNG_BOARD_COLUMNS.map((col) => {
        const cards = board[col.key];
        const fullCount = fullBoard[col.key].length;
        const swimlanes = filters.groupByInitiative ? groupBoardCardsByInitiative(cards) : null;

        return (
          <section
            key={col.key}
            className={SCE_CD_SECTION_SHELL_CLASS}
            aria-label={col.label}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = draggingId ?? e.dataTransfer.getData("text/task-id");
              if (taskId) onDropToColumn(col.key, taskId);
            }}
          >
            <div className={SCE_CD_SECTION_HEADER_CLASS}>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">{col.label}</h2>
              <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                {fullCount}
              </span>
            </div>
            <div className={SCE_CD_SECTION_BODY_CLASS}>
              {swimlanes ? (
                <div className="space-y-4">
                  {swimlanes.map((lane) => (
                    <div key={lane.key}>
                      <p className="mb-2 text-xs font-medium text-[var(--text-2)]">{lane.label}</p>
                      <CardStack
                        cards={lane.cards}
                        pending={pending}
                        canManage={canManage}
                        sprintId={sprintId}
                        onBoardRefresh={onRefresh}
                        onStatusError={onStatusError}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <CardStack
                  cards={cards}
                  pending={pending}
                  canManage={canManage}
                  sprintId={sprintId}
                  onBoardRefresh={onRefresh}
                  onStatusError={onStatusError}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              )}
              {col.key === "OPEN" && canManage ? (
                <SprintInlineTaskCreate sprintId={sprintId} disabled={pending} onCreated={onRefresh} />
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CardStack({
  cards,
  pending,
  canManage,
  sprintId,
  onBoardRefresh,
  onStatusError,
  onDragStart,
  onDragEnd,
}: {
  cards: SprintBoardCard[];
  pending: boolean;
  canManage: boolean;
  sprintId: string;
  onBoardRefresh: () => void;
  onStatusError: (message: string) => void;
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
            pending={pending}
            canManage={canManage}
            sprintId={sprintId}
            onBoardRefresh={onBoardRefresh}
            onStatusError={onStatusError}
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