"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import type { SprintBoardCard } from "@/lib/club-development/sprints/sprint-board";
import { mapSprintBoardCardToTableModel } from "@/lib/club-development/vereinsentwicklung-connected-task-table-mappers";
import VereinsentwicklungConnectedTaskTable from "./VereinsentwicklungConnectedTaskTable";
import SceCompletionProgressInline from "./SceCompletionProgressInline";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";
import { useUmsetzungsplanungDragOptional } from "./UmsetzungsplanungDragContext";
import UmsetzungsplanungTaskScheduleMenu from "./UmsetzungsplanungTaskScheduleMenu";
import type { UmsetzungsplanungPhaseOption } from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import UmsetzungsplanungInlineEmpty from "./UmsetzungsplanungInlineEmpty";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import { SceCheckbox } from "@/components/sce/forms/SceCheckbox";

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
  schedulePhaseOptions: UmsetzungsplanungPhaseOption[];
  defaultExpanded?: boolean;
  /** Increment to expand assigned tasks (e.g. schedule drag hover). */
  expandSignal?: number;
};

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
  schedulePhaseOptions,
  defaultExpanded = false,
  expandSignal = 0,
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
  const dragCtx = useUmsetzungsplanungDragOptional();

  useEffect(() => {
    if (!moveTargetId && moveTargetPhases[0]?.id) {
      setMoveTargetId(moveTargetPhases[0].id);
    }
  }, [moveTargetId, moveTargetPhases]);

  useEffect(() => {
    if (expandSignal > 0) setExpanded(true);
  }, [expandSignal]);

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
  const completedCount = cards?.filter((c) => c.status === "DONE").length ?? 0;
  const tableRows = useMemo(
    () => (cards ? cards.map(mapSprintBoardCardToTableModel) : []),
    [cards],
  );

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

  const moveTaskToPhase = (taskId: string, targetPhaseId: string) => {
    if (!targetPhaseId || targetPhaseId === sprintId) return;
    runBulkMutation(async () => {
      const addRes = await fetch(`/api/club-development/sprints/${targetPhaseId}/tasks/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: [taskId] }),
      });
      const addData = await addRes.json().catch(() => ({}));
      if (!addRes.ok) {
        throw new Error(typeof addData.error === "string" ? addData.error : "Verschieben fehlgeschlagen.");
      }
      const res = await fetch(
        `/api/club-development/sprints/${sprintId}/tasks?taskId=${encodeURIComponent(taskId)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Zuordnung konnte nicht entfernt werden.",
        );
      }
      setInfo(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.einplanenSuccess);
    });
  };

  const returnTaskToUnplanned = (taskId: string) => {
    runBulkMutation(async () => {
      const res = await fetch(
        `/api/club-development/sprints/${sprintId}/tasks?taskId=${encodeURIComponent(taskId)}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Zuordnung konnte nicht entfernt werden.",
        );
      }
      setInfo(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskReturnedUnplannedInfo);
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
        <span className="flex min-w-0 items-center gap-2">
          {typeof taskCount === "number" && taskCount > 0 ? (
            <SceCompletionProgressInline
              metricLabel={CD_STRATEGY_PROGRESS_COPY.deliveryLabel}
              completedCount={completedCount}
              totalCount={taskCount}
              countCaption={null}
              emptyLabel="Noch keine Aufgaben"
              countSuffix="Aufgaben erledigt"
              unitShortLabel={CD_STRATEGY_PROGRESS_COPY.deliveryUnitShortLabel}
              testId={`umsetzungsplanung-phase-header-progress-${sprintSlug}`}
              className="hidden sm:flex"
            />
          ) : loading ? (
            <span className="text-xs text-[var(--muted)]">…</span>
          ) : null}
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
            <VereinsentwicklungConnectedTaskTable
              rows={tableRows}
              testId={`umsetzungsplanung-phase-task-table-${sprintSlug}`}
              phaseDrag={
                canManageAssignments
                  ? {
                      enabled: true,
                      phaseId: sprintId,
                      onDragStart: (taskId) => {
                        dragCtx?.beginDrag({ taskId, source: "phase", sourcePhaseId: sprintId });
                      },
                      onDragEnd: () => dragCtx?.endDrag(),
                    }
                  : undefined
              }
              renderRowActions={(row) =>
                canManageAssignments ? (
                  <div className="flex items-center justify-end gap-1">
                    <UmsetzungsplanungTaskScheduleMenu
                      taskId={row.taskId}
                      taskTitle={row.title}
                      phaseOptions={schedulePhaseOptions}
                      sourcePhaseId={sprintId}
                      canSchedule={canManageAssignments}
                      canReturnToUnplanned
                      pending={pending}
                      onMoveToPhase={moveTaskToPhase}
                      onReturnToUnplanned={returnTaskToUnplanned}
                      testId={`umsetzungsplanung-schedule-menu-${row.taskId}`}
                    />
                    <SceCheckbox
                      checked={selectedIds.has(row.taskId)}
                      disabled={pending}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(row.taskId);
                          else next.delete(row.taskId);
                          return next;
                        });
                      }}
                      aria-label={`Aufgabe ${row.title} auswählen`}
                    />
                  </div>
                ) : null
              }
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
