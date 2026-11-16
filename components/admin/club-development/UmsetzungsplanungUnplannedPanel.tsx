"use client";

import { ChevronDown, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { SprintPlanningCatalogDto, SprintPlanningTaskDto } from "@/lib/club-development/sprints/sprint-planning-types";
import type { UmsetzungsplanungPhaseOption } from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { SceCheckbox } from "@/components/sce/forms/SceCheckbox";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import SprintTaskAssigneeDisplay from "./SprintTaskAssigneeDisplay";
import SprintTaskTitleLink from "./SprintTaskTitleLink";
import {
  filterCatalogBySearch,
  initiativeGroupSelectionState,
  toggleInitiativeGroupSelection,
} from "@/lib/club-development/sprints/sprint-bulk-planning-selection";

type Props = {
  phaseOptions: UmsetzungsplanungPhaseOption[];
  disabled?: boolean;
  onAssigned?: () => void;
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

export default function UmsetzungsplanungUnplannedPanel({ phaseOptions, disabled = false, onAssigned }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [catalog, setCatalog] = useState<SprintPlanningCatalogDto | null>(null);
  const [search, setSearch] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [expandedInitiatives, setExpandedInitiatives] = useState<Set<string>>(() => new Set());
  const [standaloneExpanded, setStandaloneExpanded] = useState(true);
  const [targetPhaseId, setTargetPhaseId] = useState(() => phaseOptions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!targetPhaseId && phaseOptions[0]?.id) {
      setTargetPhaseId(phaseOptions[0].id);
    }
  }, [phaseOptions, targetPhaseId]);

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
    if (!expanded) return;
    const handle = window.setTimeout(() => setServerSearch(search), 300);
    return () => window.clearTimeout(handle);
  }, [expanded, search]);

  useEffect(() => {
    if (!expanded) return;
    void loadCatalog(serverSearch);
  }, [expanded, loadCatalog, serverSearch]);

  const filtered = useMemo(() => {
    if (!catalog) return { initiativeGroups: [] as SprintPlanningCatalogDto["initiativeGroups"], standaloneTasks: [] as SprintPlanningTaskDto[] };
    const q = search.trim().toLowerCase();
    const initiativeGroups = catalog.initiativeGroups
      .filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.tasks.some((t) => !q || t.title.toLowerCase().includes(q)),
      )
      .map((g) => ({
        ...g,
        tasks: q ? g.tasks.filter((t) => t.title.toLowerCase().includes(q)) : g.tasks,
      }))
      .filter((g) => g.tasks.length > 0 || (!q && g.tasks.length === 0));
    const standaloneTasks = filterCatalogBySearch(search, catalog.standaloneGroup.tasks);
    return { initiativeGroups, standaloneTasks };
  }, [catalog, search]);

  const selectableIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of filtered.initiativeGroups) {
      for (const task of group.tasks) {
        if (task.selectable) ids.add(task.id);
      }
    }
    for (const task of filtered.standaloneTasks) {
      if (task.selectable) ids.add(task.id);
    }
    return ids;
  }, [filtered]);

  const toggleTask = (taskId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  const assignSelected = () => {
    if (!targetPhaseId || selectedIds.size === 0 || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/club-development/sprints/${targetPhaseId}/tasks/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds: [...selectedIds] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Zuordnung fehlgeschlagen.");
          return;
        }
        const added = typeof data.addedCount === "number" ? data.addedCount : selectedIds.size;
        setInfo(`${added} Aufgabe${added === 1 ? "" : "n"} zugeordnet.`);
        setSelectedIds(new Set());
        await loadCatalog(serverSearch);
        onAssigned?.();
      } finally {
        submittingRef.current = false;
      }
    });
  };

  const canAssign =
    !disabled && phaseOptions.length > 0 && targetPhaseId && selectedIds.size > 0 && !pending;

  return (
    <section className="rounded-lg border border-[var(--border)]" data-testid="umsetzungsplanung-unplanned-panel">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedSection}</p>
          <p className="text-xs text-[var(--muted)]">{CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.unplannedSummary}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="space-y-4 border-t border-[var(--border)] p-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Aufgaben suchen …"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm"
              disabled={disabled}
            />
          </label>
          {phaseOptions.length > 0 ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[12rem] flex-1 text-sm">
                <span className="mb-1 block text-[var(--muted)]">
                  {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.choosePhaseTarget}
                </span>
                <select
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  value={targetPhaseId}
                  onChange={(e) => setTargetPhaseId(e.target.value)}
                  disabled={disabled || pending}
                >
                  {phaseOptions.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={!canAssign}
                onClick={assignSelected}
              >
                {pending ? <Loader2 className="inline h-4 w-4 animate-spin" aria-hidden /> : null}{" "}
                {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.assignSelectedAction}
                {selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </button>
            </div>
          ) : null}
          {error ? <ClubDevelopmentFormError message={error} /> : null}
          {info ? <p className="text-sm text-[var(--sce-primary)]">{info}</p> : null}
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-[var(--muted)]" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Laden …
            </p>
          ) : null}
          {!loading && catalog && filtered.initiativeGroups.length === 0 && filtered.standaloneTasks.length === 0 ? (
            <SceClubDevelopmentEmptyState message="Keine ungeplanten Aufgaben für die aktuelle Filterung." />
          ) : null}
          {filtered.initiativeGroups.map((group) => {
            const groupState = initiativeGroupSelectionState(group.tasks, selectedIds);
            const isOpen = expandedInitiatives.has(group.initiativeId);
            return (
              <div key={group.initiativeId} className="rounded-lg border border-[var(--border)]">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setExpandedInitiatives((prev) => {
                      const next = new Set(prev);
                      if (next.has(group.initiativeId)) next.delete(group.initiativeId);
                      else next.add(group.initiativeId);
                      return next;
                    })
                  }
                >
                  <ChevronDown className={`h-4 w-4 ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                  <span className="text-sm font-medium">{group.title}</span>
                  <span className="text-xs text-[var(--muted)]">({group.tasks.length})</span>
                  <span className="ml-auto">
                    <SceCheckbox
                      checked={groupState === "all"}
                      onChange={() =>
                        setSelectedIds((prev) => toggleInitiativeGroupSelection(group.tasks, prev))
                      }
                      aria-label={`Alle auswählbaren Aufgaben des Vorhabens ${group.title} auswählen`}
                      disabled={disabled}
                    />
                  </span>
                </button>
                {isOpen ? (
                  <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                    {group.tasks.map((task) => (
                      <UnplannedTaskRow
                        key={task.id}
                        task={task}
                        checked={selectedIds.has(task.id)}
                        onCheckedChange={(checked) => toggleTask(task.id, checked)}
                        disabled={disabled || !task.selectable}
                      />
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
          {filtered.standaloneTasks.length > 0 ? (
            <div className="rounded-lg border border-[var(--border)]">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
                aria-expanded={standaloneExpanded}
                onClick={() => setStandaloneExpanded((v) => !v)}
              >
                <ChevronDown className={`h-4 w-4 ${standaloneExpanded ? "rotate-180" : ""}`} aria-hidden />
                <span className="text-sm font-medium">Ohne Vorhaben</span>
              </button>
              {standaloneExpanded ? (
                <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                  {filtered.standaloneTasks.map((task) => (
                    <UnplannedTaskRow
                      key={task.id}
                      task={task}
                      checked={selectedIds.has(task.id)}
                      onCheckedChange={(checked) => toggleTask(task.id, checked)}
                      disabled={disabled || !task.selectable}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {selectableIds.size > 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Tastatur: Aufgaben per Kontrollkästchen auswählen, Zielphase wählen, dann „
              {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.assignSelectedAction}“.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function UnplannedTaskRow({
  task,
  checked,
  onCheckedChange,
  disabled,
}: {
  task: SprintPlanningTaskDto;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  const due = formatDueDate(task.dueAt);
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2" data-testid={`umsetzungsplanung-unplanned-task-${task.id}`}>
      <SceCheckbox
        checked={checked}
        onChange={() => onCheckedChange(!checked)}
        disabled={disabled}
        className="mt-1"
        aria-label={task.title}
      />
      <div className="min-w-0 flex-1">
        <SprintTaskTitleLink taskId={task.id} title={task.title} />
        <p className="text-xs text-[var(--muted)]">
          {task.statusLabel}
          {due ? ` · Fällig ${due}` : ""}
        </p>
        <SprintTaskAssigneeDisplay assignees={task.assignees} />
      </div>
    </li>
  );
}