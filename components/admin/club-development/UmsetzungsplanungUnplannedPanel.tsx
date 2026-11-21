"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { SprintPlanningCatalogDto, SprintPlanningTaskDto } from "@/lib/club-development/sprints/sprint-planning-types";
import { flattenUnplannedCatalogTasks } from "@/lib/club-development/sprints/unplanned-catalog-flatten";
import { applyUnplannedOrderToCatalog } from "@/lib/club-development/unplanned-catalog-reorder";
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
import SceCompletionProgressInline from "./SceCompletionProgressInline";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";
import { useUmsetzungsplanungDragOptional } from "./UmsetzungsplanungDragContext";
import UmsetzungsplanungTaskScheduleMenu from "./UmsetzungsplanungTaskScheduleMenu";

type Props = {
  phaseOptions: UmsetzungsplanungPhaseOption[];
  schedulingCapable?: boolean;
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
  schedulingCapable = false,
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
  const submittingRef = useRef(false);
  const persistGenerationRef = useRef(0);
  const lastPersistedOrderRef = useRef<string | null>(null);
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
    lastPersistedOrderRef.current = flattenUnplannedCatalogTasks(result.data.catalog)
      .map((t) => t.id)
      .join(",");
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
  const headerDeliveryProgress = catalog?.aggregateDeliveryProgress ?? null;

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
      const orderKey = orderedTaskIds.join(",");
      if (orderKey === lastPersistedOrderRef.current) {
        return { ok: true as const };
      }
      const generation = persistGenerationRef.current + 1;
      persistGenerationRef.current = generation;
      setError(null);
      setCatalog((current) => (current ? applyUnplannedOrderToCatalog(current, orderedTaskIds) : current));
      try {
        const res = await fetch("/api/club-development/umsetzungsplanung/unplanned-order", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedTaskIds }),
        });
        const data = await res.json().catch(() => ({}));
        if (generation !== persistGenerationRef.current) {
          return { ok: true as const };
        }
        if (!res.ok) {
          const message =
            typeof data.error === "string"
              ? data.error
              : CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedReorderFailed;
          setError(message);
          await loadCatalog(serverSearch);
          return { ok: false as const, error: message };
        }
        lastPersistedOrderRef.current = orderKey;
        setInfo(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedReorderSaved);
        return { ok: true as const };
      } catch {
        if (generation === persistGenerationRef.current) {
          await loadCatalog(serverSearch);
        }
        const message = CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedReorderFailed;
        setError(message);
        return { ok: false as const, error: message };
      }
    },
    [loadCatalog, serverSearch],
  );

  const optimisticRemoveTask = useCallback((taskId: string) => {
    setCatalog((current) => {
      if (!current) return current;
      return {
        ...current,
        initiativeGroups: current.initiativeGroups
          .map((group) => ({
            ...group,
            tasks: group.tasks.filter((t) => t.id !== taskId),
          }))
          .filter((group) => group.tasks.length > 0),
        standaloneGroup: {
          tasks: current.standaloneGroup.tasks.filter((t) => t.id !== taskId),
        },
      };
    });
  }, []);

  useEffect(() => {
    dragCtx?.registerUnplannedScheduleHooks({
      onOptimisticRemove: optimisticRemoveTask,
      onRollbackRestore: () => void loadCatalog(serverSearch),
    });
    return () => dragCtx?.registerUnplannedScheduleHooks(null);
  }, [dragCtx, loadCatalog, optimisticRemoveTask, serverSearch]);

  const assignTaskToPhase = async (taskId: string, phaseId: string) => {
    if (!phaseId || submittingRef.current || !schedulingCapable) return;
    submittingRef.current = true;
    setAssigningTaskId(taskId);
    setError(null);
    setInfo(null);
    optimisticRemoveTask(taskId);
    try {
      const res = await fetch(`/api/club-development/sprints/${phaseId}/tasks/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: [taskId] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : "Einplanen fehlgeschlagen.";
        setError(message);
        await loadCatalog(serverSearch);
        throw new Error(message);
      }
      setInfo(CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.einplanenSuccess);
      await loadCatalog(serverSearch);
      onAssigned?.();
    } finally {
      submittingRef.current = false;
      setAssigningTaskId(null);
    }
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

  const returnDropVisible = dragCtx?.dragging?.source === "phase";

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
      headerAside={
        headerDeliveryProgress && headerDeliveryProgress.totalCount > 0 ? (
          <SceCompletionProgressInline
            metricLabel={CD_STRATEGY_PROGRESS_COPY.deliveryLabel}
            completedCount={headerDeliveryProgress.completedCount}
            totalCount={headerDeliveryProgress.totalCount}
            countCaption={null}
            emptyLabel="Noch keine Aufgaben"
            countSuffix="Aufgaben erledigt"
            unitShortLabel={CD_STRATEGY_PROGRESS_COPY.deliveryUnitShortLabel}
            testId="umsetzungsplanung-unplanned-header-progress"
            className="hidden shrink-0 sm:flex"
          />
        ) : null
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
                disabled={!schedulingCapable || pending}
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
              dragEnabled: phaseOptions.length > 0,
              canReorder: !reorderBlocked,
              pending: pending,
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
              const canPlan = schedulingCapable && task?.selectable !== false;
              const isAssigning = assigningTaskId === row.taskId && pending;
              return (
                <UmsetzungsplanungTaskScheduleMenu
                  taskId={row.taskId}
                  taskTitle={row.title}
                  phaseOptions={phaseOptions}
                  canSchedule={canPlan}
                  pending={isAssigning || pending}
                  onMoveToPhase={(taskId, phaseId) => assignTaskToPhase(taskId, phaseId)}
                  testId={`umsetzungsplanung-schedule-menu-${row.taskId}`}
                />
              );
            }}
          />
        ) : null}
      </div>
    </UmsetzungsplanungCollapsibleSection>
  );
}