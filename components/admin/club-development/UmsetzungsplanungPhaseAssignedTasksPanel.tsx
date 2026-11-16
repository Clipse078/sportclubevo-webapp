"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { DevelopmentSprintStatus, TaskStatus } from "@prisma/client";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import type { SprintBoardCard } from "@/lib/club-development/sprints/sprint-board";
import { groupAssignedSprintBoardCards } from "@/lib/club-development/sprints/umsetzungsplanung-assigned-tasks";
import type { UmsetzungsplanungPhaseOption } from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import UmsetzungsplanungInlineEmpty from "./UmsetzungsplanungInlineEmpty";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import { SceCheckbox } from "@/components/sce/forms/SceCheckbox";
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
  sprintStatus: DevelopmentSprintStatus;
  canManageAssignments: boolean;
  moveTargetPhases: UmsetzungsplanungPhaseOption[];
  defaultExpanded?: boolean;
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

export default function UmsetzungsplanungPhaseAssignedTasksPanel({
  sprintId,
  sprintSlug,
  canManageAssignments,
  moveTargetPhases,
  defaultExpanded = false,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [cards, setCards] = useState<SprintBoardCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [moveTargetId, setMoveTargetId] = useState(() => moveTargetPhases[0]?.id ?? "");
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!moveTargetId && moveTargetPhases[0]?.id) {
      setMoveTargetId(moveTargetPhases[0].id);
    }
  }, [moveTargetId, moveTargetPhases]);

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

  const grouped = useMemo(
    () => (cards ? groupAssignedSprintBoardCards(cards, STATUS_LABELS) : []),
    [cards],
  );

  const taskCount = cards?.length;

  const runBulkMutation = (action: () => Promise<void>) => {
    if (submittingRef.current || pending) return;
    submittingRef.current = true;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        await action();
        setSelectedIds(new Set());
        await loadAssignedTasks();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen.");
      } finally {
        submittingRef.current = false;
      }
    });
  };

  const removeSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    runBulkMutation(async () => {
      for (const taskId of selectedIds) {
        const res = await fetch(
          `/api/club-development/sprints/${sprintId}/tasks?taskId=${encodeURIComponent(taskId)}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Zuordnung konnte nicht entfernt werden.");
        }
      }
      setInfo(`${count} Zuordnung${count === 1 ? "" : "en"} entfernt.`);
    });
  };

  const moveSelected = () => {
    if (!moveTargetId || selectedIds.size === 0) return;
    const movedCount = selectedIds.size;
    runBulkMutation(async () => {
      const addRes = await fetch(`/api/club-development/sprints/${moveTargetId}/tasks/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: [...selectedIds] }),
      });
      const addData = await addRes.json().catch(() => ({}));
      if (!addRes.ok) {
        throw new Error(typeof addData.error === "string" ? addData.error : "Verschieben fehlgeschlagen.");
      }
      for (const taskId of selectedIds) {
        await fetch(`/api/club-development/sprints/${sprintId}/tasks?taskId=${encodeURIComponent(taskId)}`, {
          method: "DELETE",
        });
      }
      const moved = typeof addData.addedCount === "number" ? addData.addedCount : movedCount;
      setInfo(`${moved} Aufgabe${moved === 1 ? "" : "n"} verschoben.`);
    });
  };

  const canRemoveAssignments = canManageAssignments && selectedIds.size > 0 && !pending;
  const canMoveAssignments =
    canRemoveAssignments && moveTargetPhases.length > 0 && Boolean(moveTargetId);

  return (
    <div className="px-1" data-testid={`umsetzungsplanung-phase-tasks-${sprintSlug}`}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md py-1.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)]/60"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        data-testid={`umsetzungsplanung-phase-tasks-toggle-${sprintSlug}`}
      >
        <span className="font-medium">{CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.assignedTasksSection}</span>
        <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          {typeof taskCount === "number" ? `${taskCount}` : loading ? "…" : ""}
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      {expanded ? (
        <div className="mt-1 space-y-3 pb-1">
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-[var(--muted)]" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.assignedTasksLoading}
            </p>
          ) : null}
          {error ? (
            <div className="space-y-2">
              <ClubDevelopmentFormError message={error} />
              <button
                type="button"
                className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
                onClick={() => void loadAssignedTasks()}
              >
                Erneut laden
              </button>
            </div>
          ) : null}
          {!loading && !error && cards && cards.length === 0 ? (
            <UmsetzungsplanungInlineEmpty
              message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noAssignedTasks}
              testId={`umsetzungsplanung-phase-tasks-empty-${sprintSlug}`}
            />
          ) : null}
          {canManageAssignments && cards && cards.length > 0 ? (
            <div className="flex flex-wrap items-end gap-2 rounded-md bg-[var(--surface-2)]/50 px-2 py-2">
              {moveTargetPhases.length > 0 ? (
                <label className="min-w-[10rem] flex-1 text-xs">
                  <span className="mb-1 block text-[var(--muted)]">
                    {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.chooseMoveTargetPhase}
                  </span>
                  <select
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                    value={moveTargetId}
                    onChange={(e) => setMoveTargetId(e.target.value)}
                    disabled={pending}
                  >
                    {moveTargetPhases.map((phase) => (
                      <option key={phase.id} value={phase.id}>
                        {phase.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                className="rounded-md bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                disabled={!canMoveAssignments}
                onClick={moveSelected}
              >
                {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.moveSelectedTasksAction}
                {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] disabled:opacity-50"
                disabled={!canRemoveAssignments}
                onClick={removeSelected}
              >
                {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.removeAssignmentAction}
              </button>
            </div>
          ) : null}
          {info ? <p className="text-xs text-[var(--sce-primary)]">{info}</p> : null}
          {!loading && !error && cards && cards.length > 0 ? (
            <div className="space-y-3">
              {grouped.map((initiativeGroup) => (
                <InitiativeTasksSection
                  key={initiativeGroup.initiativeId ?? "standalone"}
                  initiativeGroup={initiativeGroup}
                  sprintSlug={sprintSlug}
                  canManageAssignments={canManageAssignments}
                  selectedIds={selectedIds}
                  onToggleTask={(taskId, checked) =>
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(taskId);
                      else next.delete(taskId);
                      return next;
                    })
                  }
                  pending={pending}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InitiativeTasksSection({
  initiativeGroup,
  sprintSlug,
  canManageAssignments,
  selectedIds,
  onToggleTask,
  pending,
}: {
  initiativeGroup: ReturnType<typeof groupAssignedSprintBoardCards>[number];
  sprintSlug: string;
  canManageAssignments: boolean;
  selectedIds: Set<string>;
  onToggleTask: (taskId: string, checked: boolean) => void;
  pending: boolean;
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {initiativeGroup.initiativeLabel}
      </h4>
      {initiativeGroup.byStatus.map((statusGroup) => (
        <div key={`${initiativeGroup.initiativeId}-${statusGroup.status}`} className="space-y-1">
          <p className="text-xs font-medium text-[var(--text-2)]">{statusGroup.statusLabel}</p>
          <ul className="divide-y divide-[var(--border)]/60">
            {statusGroup.tasks.map((card) => (
              <AssignedTaskRow
                key={card.taskId}
                card={card}
                sprintSlug={sprintSlug}
                selectable={canManageAssignments}
                checked={selectedIds.has(card.taskId)}
                onCheckedChange={(checked) => onToggleTask(card.taskId, checked)}
                disabled={pending}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function AssignedTaskRow({
  card,
  sprintSlug,
  selectable,
  checked,
  onCheckedChange,
  disabled,
}: {
  card: SprintBoardCard;
  sprintSlug: string;
  selectable: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  const due = formatDueDate(card.dueAt);
  return (
    <li
      className="flex gap-2 py-2"
      data-testid={`umsetzungsplanung-phase-task-${sprintSlug}-${card.taskId}`}
    >
      {selectable ? (
        <SceCheckbox
          checked={checked}
          onChange={() => onCheckedChange(!checked)}
          disabled={disabled}
          className="mt-0.5"
          aria-label={card.title}
        />
      ) : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        <SprintTaskTitleLink taskId={card.taskId} title={card.title} className="text-sm font-medium" />
        {due ? <p className="text-xs text-[var(--muted)]">Fällig {due}</p> : null}
        <SprintTaskAssigneeDisplay assignees={card.assignees} compact />
      </div>
    </li>
  );
}