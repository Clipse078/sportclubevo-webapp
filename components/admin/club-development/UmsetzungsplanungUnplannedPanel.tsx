"use client";

import { Calendar, ChevronDown, ChevronUp, Loader2, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { SprintPlanningCatalogDto, SprintPlanningTaskDto } from "@/lib/club-development/sprints/sprint-planning-types";
import { flattenUnplannedCatalogTasks } from "@/lib/club-development/sprints/unplanned-catalog-flatten";
import type { UmsetzungsplanungPhaseOption } from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { mapPlanningTaskToTableModel } from "@/lib/club-development/vereinsentwicklung-connected-task-table-mappers";
import {
  parseUmsetzungsplanungDragPayload,
  UMSETZUNGSPLANUNG_DND_MIME,
} from "@/lib/club-development/umsetzungsplanung-dnd";
import { cn } from "@/lib/cn";
import UmsetzungsplanungCollapsibleSection from "./UmsetzungsplanungCollapsibleSection";
import { UMSETZUNGSPLANUNG_SECTION_ACCENTS } from "@/lib/club-development/umsetzungsplanung-section-accent";
import UmsetzungsplanungInlineEmpty from "./UmsetzungsplanungInlineEmpty";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import VereinsentwicklungConnectedTaskTable from "./VereinsentwicklungConnectedTaskTable";
import { useUmsetzungsplanungDragOptional } from "./UmsetzungsplanungDragContext";

type Props = {
  phaseOptions: UmsetzungsplanungPhaseOption[];
  assignDisabled?: boolean;
  onAssigned?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery?: string;
};

function countCatalogTasks(catalog: SprintPlanningCatalogDto): number {
  return flattenUnplannedCatalogTasks(catalog).length;
}

export default function UmsetzungsplanungUnplannedPanel({
  phaseOptions,
  assignDisabled = false,
  onAssigned,
  open,
  onOpenChange,
  searchQuery,
}: Props) {
  const dragCtx = useUmsetzungsplanungDragOptional();
  const [catalog, setCatalog] = useState<SprintPlanningCatalogDto | null>(null);
  const [search, setSearch] = useState("");
  const effectiveSearch = searchQuery ?? search;
  const [serverSearch, setServerSearch] = useState("");
  const [defaultPhaseId, setDefaultPhaseId] = useState(() => phaseOptions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [reorderPending, setReorderPending] = useState(false);
  const submittingRef = useRef(false);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [returnDropActive, setReturnDropActive] = useState(false);

  useEffect(() => {
    if (!defaultPhaseId && phaseOptions[0]?.id) {
      setDefaultPhaseId(phaseOptions[0].id);
    }
  }, [phaseOptions, defaultPhaseId]);

  const loadCatalog = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    const params = q.trim().length >= 2 ? `?q=${encodeURIComponent(q.trim())}` : "";
    const result = await clubDevelopmentFetchJson<{ catalog: SprintPlanningCatalogDto }>(
      `/api/club-development/umsetzungsplanung/unplanned-candidates${params}`,
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCatalog(result.data.catalog);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => setServerSearch(effectiveSearch), 300);
    return () => window.clearTimeout(handle);
  }, [open, effectiveSearch]);

  useEffect(() => {
    if (!open) return;
    void loadCatalog(serverSearch);
  }, [open, loadCatalog, serverSearch]);

  const headerCount = catalog ? countCatalogTasks(catalog) : null;

  const rankedTasks = useMemo(
    () => (catalog ? flattenUnplannedCatalogTasks(catalog) : []),
    [catalog],
  );

  const filteredTasks = useMemo(() => {
    const q = effectiveSearch.trim().toLowerCase();
    if (!q) return rankedTasks;
    return rankedTasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(q) ||
        (task.targetTitle?.toLowerCase().includes(q) ?? false) ||
        (task.strategyTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [effectiveSearch, rankedTasks]);

  const allOrderedTaskIds = useMemo(() => rankedTasks.map((t) => t.id), [rankedTasks]);

  const reorderBlocked =
    effectiveSearch.trim().length > 0 || serverSearch.trim().length >= 2;

  const tableRows = useMemo(
    () => filteredTasks.map(mapPlanningTaskToTableModel),
    [filteredTasks],
  );

  const persistOrder = useCallback(
    async (orderedTaskIds: string[]) => {
      setReorderPending(true);
      setError(null);
      try {
        const res = await fetch("/api/club-development/umsetzungsplanung/unplanned-order", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedTaskIds }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            typeof data.error === "string"
              ? data.error
              : CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedReorderFailed;
          setError(message);
          return { ok: false as const, error: message };
        }
        setInfo(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedReorderSaved);
        await loadCatalog(serverSearch);
        return { ok: true as const };
      } finally {
        setReorderPending(false);
      }
    },
    [loadCatalog, serverSearch],
  );

  const moveTaskByOffset = (taskId: string, offset: -1 | 1) => {
    if (reorderBlocked) return;
    const idx = allOrderedTaskIds.indexOf(taskId);
    if (idx < 0) return;
    const target = idx + offset;
    if (target < 0 || target >= allOrderedTaskIds.length) return;
    const next = [...allOrderedTaskIds];
    const [removed] = next.splice(idx, 1);
    if (!removed) return;
    next.splice(target, 0, removed);
    startTransition(async () => {
      await persistOrder(next);
    });
  };

  const assignTaskToPhase = (taskId: string, phaseId: string) => {
    if (!phaseId || submittingRef.current || assignDisabled) return;
    submittingRef.current = true;
    setAssigningTaskId(taskId);
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/club-development/sprints/${phaseId}/tasks/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds: [taskId] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Einplanen fehlgeschlagen.");
          return;
        }
        setInfo(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.einplanenSuccess);
        await loadCatalog(serverSearch);
        onAssigned?.();
      } finally {
        submittingRef.current = false;
        setAssigningTaskId(null);
      }
    });
  };

  const unassignFromPhase = (taskId: string, phaseId: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/club-development/sprints/${phaseId}/tasks?taskId=${encodeURIComponent(taskId)}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Zuordnung konnte nicht entfernt werden.");
          return;
        }
        setInfo(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskReturnedUnplannedInfo);
        await loadCatalog(serverSearch);
        onAssigned?.();
      } finally {
        submittingRef.current = false;
      }
    });
  };

  const handleReturnDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setReturnDropActive(false);
    const raw =
      event.dataTransfer.getData(UMSETZUNGSPLANUNG_DND_MIME) ||
      event.dataTransfer.getData("text/plain");
    const payload = parseUmsetzungsplanungDragPayload(raw);
    if (!payload || payload.source !== "phase" || !payload.sourcePhaseId) return;
    dragCtx?.endDrag();
    unassignFromPhase(payload.taskId, payload.sourcePhaseId);
  };

  const returnDropVisible =
  dragCtx?.dragging?.source === "phase" && !assignDisabled;

  return (
    <UmsetzungsplanungCollapsibleSection
      title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedSection}
      count={headerCount}
      open={open}
      onOpenChange={onOpenChange}
      testId="umsetzungsplanung-unplanned-panel"
      headerAccentClass={UMSETZUNGSPLANUNG_SECTION_ACCENTS.unplanned.headerClass}
      sectionBadge={
        <span
          className={UMSETZUNGSPLANUNG_SECTION_ACCENTS.unplanned.badgeClass}
          data-testid="umsetzungsplanung-unplanned-badge"
        >
          Ungeplant
        </span>
      }
    >
      <div
        className={cn(
          "space-y-3 rounded-lg transition-shadow",
          returnDropActive && returnDropVisible && "ring-2 ring-[var(--sce-primary)] ring-offset-2",
        )}
        onDragOver={(event) => {
          if (!returnDropVisible) return;
          event.preventDefault();
          setReturnDropActive(true);
        }}
        onDragLeave={() => setReturnDropActive(false)}
        onDrop={(e) => void handleReturnDrop(e)}
        data-testid="umsetzungsplanung-unplanned-drop-zone"
      >
        {returnDropVisible ? (
          <p className="px-1 text-xs text-[var(--text-2)]">
            {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedDropReturnHint}
          </p>
        ) : null}
        <div className="flex flex-wrap items-end gap-3 px-1">
          {searchQuery === undefined ? (
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block text-xs text-[var(--muted)]">Aufgaben suchen …</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Aufgaben suchen …"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </label>
          ) : null}
          {phaseOptions.length > 0 ? (
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block text-xs text-[var(--muted)]">
                {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.choosePhaseTarget}
              </span>
              <select
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                value={defaultPhaseId}
                onChange={(e) => setDefaultPhaseId(e.target.value)}
                disabled={assignDisabled || pending}
              >
                {phaseOptions.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {reorderBlocked ? (
          <p className="px-1 text-xs text-[var(--muted)]">
            {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedReorderFilteredHint}
          </p>
        ) : null}

        {error ? (
          <div className="space-y-2 px-1">
            <ClubDevelopmentFormError message={error || CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedLoadError} />
            <button
              type="button"
              className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
              onClick={() => void loadCatalog(serverSearch)}
            >
              Erneut laden
            </button>
          </div>
        ) : null}
        {info ? <p className="px-1 text-sm text-[var(--sce-primary)]">{info}</p> : null}
        {loading ? (
          <p className="flex items-center gap-2 px-1 text-sm text-[var(--muted)]" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Laden …
          </p>
        ) : null}
        {!loading && !error && catalog && filteredTasks.length === 0 ? (
          <UmsetzungsplanungInlineEmpty message="Keine ungeplanten Aufgaben für die aktuelle Filterung." />
        ) : null}
        {!loading && !error && filteredTasks.length > 0 ? (
          <VereinsentwicklungConnectedTaskTable
            rows={tableRows}
            showReorderHandle
            reorder={{
              dragEnabled: !assignDisabled && phaseOptions.length > 0,
              canReorder: !reorderBlocked && !reorderPending,
              pending: pending || reorderPending,
              allOrderedTaskIds,
              onPersistOrder: persistOrder,
              onDragStart: (taskId) => {
                dragCtx?.beginDrag({ taskId, source: "unplanned" });
              },
              onDragEnd: () => dragCtx?.endDrag(),
            }}
            testId="umsetzungsplanung-unplanned-task-table"
            renderRowActions={(row) => {
              const task = filteredTasks.find((t) => t.id === row.taskId);
              const canPlan =
                !assignDisabled &&
                phaseOptions.length > 0 &&
                Boolean(defaultPhaseId) &&
                task?.selectable !== false;
              const isAssigning = assigningTaskId === row.taskId && pending;
              const idx = allOrderedTaskIds.indexOf(row.taskId);
              const canMove = !reorderBlocked && !reorderPending;
              return (
                <div className="flex flex-wrap items-center justify-end gap-1">
                  {canMove ? (
                    <>
                      <button
                        type="button"
                        className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                        disabled={idx <= 0}
                        aria-label={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskMoveUpAction}
                        onClick={() => moveTaskByOffset(row.taskId, -1)}
                        data-testid={`umsetzungsplanung-move-up-${row.taskId}`}
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                        disabled={idx < 0 || idx >= allOrderedTaskIds.length - 1}
                        aria-label={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.taskMoveDownAction}
                        onClick={() => moveTaskByOffset(row.taskId, 1)}
                        data-testid={`umsetzungsplanung-move-down-${row.taskId}`}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </button>
                    </>
                  ) : null}
                  {canPlan ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--sce-primary)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                      disabled={isAssigning || pending}
                      onClick={() => assignTaskToPhase(row.taskId, defaultPhaseId)}
                      data-testid={`umsetzungsplanung-einplanen-${row.taskId}`}
                    >
                      {isAssigning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Calendar className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.einplanenAction}
                    </button>
                  ) : (
                    <span
                      className="text-[var(--muted)]"
                      title={task?.exclusionReason ?? undefined}
                      aria-hidden
                    >
                      <MoreVertical className="h-4 w-4" />
                    </span>
                  )}
                </div>
              );
            }}
          />
        ) : null}
      </div>
    </UmsetzungsplanungCollapsibleSection>
  );
}