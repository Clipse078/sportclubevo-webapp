"use client";

import { Calendar, Loader2, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { SprintPlanningCatalogDto, SprintPlanningTaskDto } from "@/lib/club-development/sprints/sprint-planning-types";
import type { UmsetzungsplanungPhaseOption } from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { mapPlanningTaskToTableModel } from "@/lib/club-development/vereinsentwicklung-connected-task-table-mappers";
import UmsetzungsplanungCollapsibleSection from "./UmsetzungsplanungCollapsibleSection";
import UmsetzungsplanungInlineEmpty from "./UmsetzungsplanungInlineEmpty";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import VereinsentwicklungConnectedTaskTable from "./VereinsentwicklungConnectedTaskTable";

type Props = {
  phaseOptions: UmsetzungsplanungPhaseOption[];
  disabled?: boolean;
  onAssigned?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function countCatalogTasks(catalog: SprintPlanningCatalogDto): number {
  let total = catalog.standaloneGroup.tasks.length;
  for (const group of catalog.initiativeGroups) {
    total += group.tasks.length;
  }
  return total;
}

function flattenCatalogTasks(catalog: SprintPlanningCatalogDto): SprintPlanningTaskDto[] {
  const tasks: SprintPlanningTaskDto[] = [];
  for (const group of catalog.initiativeGroups) {
    tasks.push(...group.tasks);
  }
  tasks.push(...catalog.standaloneGroup.tasks);
  return tasks;
}

export default function UmsetzungsplanungUnplannedPanel({
  phaseOptions,
  disabled = false,
  onAssigned,
  open,
  onOpenChange,
}: Props) {
  const [catalog, setCatalog] = useState<SprintPlanningCatalogDto | null>(null);
  const [search, setSearch] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [defaultPhaseId, setDefaultPhaseId] = useState(() => phaseOptions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

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
    const handle = window.setTimeout(() => setServerSearch(search), 300);
    return () => window.clearTimeout(handle);
  }, [open, search]);

  useEffect(() => {
    if (!open) return;
    void loadCatalog(serverSearch);
  }, [open, loadCatalog, serverSearch]);

  const headerCount = catalog ? countCatalogTasks(catalog) : null;

  const filteredTasks = useMemo(() => {
    if (!catalog) return [] as SprintPlanningTaskDto[];
    const q = search.trim().toLowerCase();
    return flattenCatalogTasks(catalog).filter((task) => {
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        (task.targetTitle?.toLowerCase().includes(q) ?? false) ||
        (task.strategyTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [catalog, search]);

  const tableRows = useMemo(
    () => filteredTasks.map(mapPlanningTaskToTableModel),
    [filteredTasks],
  );

  const assignTaskToPhase = (taskId: string, phaseId: string) => {
    if (!phaseId || submittingRef.current || disabled) return;
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

  return (
    <UmsetzungsplanungCollapsibleSection
      title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedSection}
      count={headerCount}
      open={open}
      onOpenChange={onOpenChange}
      testId="umsetzungsplanung-unplanned-panel"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3 px-1">
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className="mb-1 block text-xs text-[var(--muted)]">Aufgaben suchen …</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Aufgaben suchen …"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              disabled={disabled}
            />
          </label>
          {phaseOptions.length > 0 ? (
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block text-xs text-[var(--muted)]">
                {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.choosePhaseTarget}
              </span>
              <select
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                value={defaultPhaseId}
                onChange={(e) => setDefaultPhaseId(e.target.value)}
                disabled={disabled || pending}
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
            testId="umsetzungsplanung-unplanned-task-table"
            renderRowActions={(row) => {
              const task = filteredTasks.find((t) => t.id === row.taskId);
              const canPlan =
                !disabled &&
                phaseOptions.length > 0 &&
                Boolean(defaultPhaseId) &&
                task?.selectable !== false;
              const isAssigning = assigningTaskId === row.taskId && pending;
              if (!canPlan) {
                return (
                  <span
                    className="text-[var(--muted)]"
                    title={task?.exclusionReason ?? undefined}
                    aria-hidden
                  >
                    <MoreVertical className="h-4 w-4" />
                  </span>
                );
              }
              return (
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
              );
            }}
          />
        ) : null}
      </div>
    </UmsetzungsplanungCollapsibleSection>
  );
}