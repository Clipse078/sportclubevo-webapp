"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { TaskStatus } from "@prisma/client";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import type { SprintBoardCard } from "@/lib/club-development/sprints/sprint-board";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import SprintTaskAssigneeDisplay from "./SprintTaskAssigneeDisplay";
import SprintTaskTitleLink from "./SprintTaskTitleLink";

const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Arbeit",
  DONE: "Erledigt",
  CANCELLED: "Abgebrochen",
};

type BoardResponse = {
  columns: {
    OPEN?: SprintBoardCard[];
    IN_PROGRESS?: SprintBoardCard[];
    DONE?: SprintBoardCard[];
  };
};

type Props = {
  sprintId: string;
  sprintSlug: string;
};

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function flattenBoardCards(data: BoardResponse): SprintBoardCard[] {
  const columns = data.columns ?? {};
  return [
    ...(columns.OPEN ?? []),
    ...(columns.IN_PROGRESS ?? []),
    ...(columns.DONE ?? []),
  ];
}

export default function UmsetzungsplanungPhaseAssignedTasksPanel({ sprintId, sprintSlug }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [cards, setCards] = useState<SprintBoardCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignedTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await clubDevelopmentFetchJson<BoardResponse>(
      `/api/club-development/sprints/${sprintId}/board`,
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      setCards(null);
      return;
    }
    setCards(flattenBoardCards(result.data));
  }, [sprintId]);

  useEffect(() => {
    if (!expanded) return;
    void loadAssignedTasks();
  }, [expanded, loadAssignedTasks]);

  const taskCount = cards?.length;

  return (
    <div
      className="border-t border-[var(--border)] pt-2"
      data-testid={`umsetzungsplanung-phase-tasks-${sprintSlug}`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        data-testid={`umsetzungsplanung-phase-tasks-toggle-${sprintSlug}`}
      >
        <span className="font-medium">{CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.assignedTasksSection}</span>
        <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          {typeof taskCount === "number" ? `${taskCount}` : ""}
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      {expanded ? (
        <div className="mt-2 space-y-2">
          {loading ? (
            <p className="flex items-center gap-2 px-1 text-xs text-[var(--muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.assignedTasksLoading}
            </p>
          ) : null}
          {error ? <ClubDevelopmentFormError message={error} /> : null}
          {!loading && !error && cards && cards.length === 0 ? (
            <SceClubDevelopmentEmptyState message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noAssignedTasks} />
          ) : null}
          {!loading && !error && cards && cards.length > 0 ? (
            <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
              {cards.map((card) => (
                <AssignedTaskRow key={card.taskId} card={card} sprintSlug={sprintSlug} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AssignedTaskRow({ card, sprintSlug }: { card: SprintBoardCard; sprintSlug: string }) {
  const due = formatDueDate(card.dueAt);
  const statusLabel = STATUS_LABELS[card.status] ?? card.status;
  return (
    <li
      className="space-y-1 px-3 py-2"
      data-testid={`umsetzungsplanung-phase-task-${sprintSlug}-${card.taskId}`}
    >
      <SprintTaskTitleLink taskId={card.taskId} title={card.title} className="font-medium" />
      <p className="text-xs text-[var(--muted)]">
        {statusLabel}
        {card.initiativeLabel ? ` · ${card.initiativeLabel}` : ""}
        {due ? ` · Fällig ${due}` : ""}
      </p>
      <SprintTaskAssigneeDisplay assignees={card.assignees} compact />
    </li>
  );
}