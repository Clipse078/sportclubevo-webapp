"use client";

import { ChevronDown, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import type { SprintPlanningCatalogDto, SprintPlanningTaskDto } from "@/lib/club-development/sprints/sprint-planning-types";
import {
  filterCatalogBySearch,
  initiativeGroupSelectionState,
  matchesInitiativeSearch,
  toggleInitiativeGroupSelection,
} from "@/lib/club-development/sprints/sprint-bulk-planning-selection";

type Props = {
  sprintId: string;
  disabled?: boolean;
  onAdded: () => void;
};

type BulkAddResponse = {
  addedCount?: number;
  addedTaskIds?: string[];
  rejected?: { taskId: string; message: string }[];
  error?: string;
  partial?: boolean;
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

export default function SprintBulkTaskPlanningPanel({ sprintId, disabled = false, onAdded }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [catalog, setCatalog] = useState<SprintPlanningCatalogDto | null>(null);
  const [search, setSearch] = useState("");
  const [serverSearch, setServerSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [expandedInitiatives, setExpandedInitiatives] = useState<Set<string>>(() => new Set());
  const [standaloneExpanded, setStandaloneExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const submittingRef = useRef(false);

  const loadCatalog = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    const params = q.trim().length >= 2 ? `?q=${encodeURIComponent(q.trim())}` : "";
    const result = await clubDevelopmentFetchJson<{ catalog: SprintPlanningCatalogDto }>(
      `/api/club-development/sprints/${sprintId}/planning-candidates${params}`,
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCatalog(result.data.catalog);
  }, [sprintId]);

  useEffect(() => {
    if (!expanded) return;
    const handle = window.setTimeout(() => {
      setServerSearch(search);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [expanded, search]);

  useEffect(() => {
    if (!expanded) return;
    void loadCatalog(serverSearch);
  }, [expanded, loadCatalog, serverSearch]);

  const filteredGroups = useMemo(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.initiativeGroups
      .filter(
        (g) =>
          matchesInitiativeSearch(g.title, search) ||
          g.tasks.some((t) => !q || t.title.toLowerCase().includes(q)),
      )
      .map((g) => ({
        ...g,
        tasks: q ? g.tasks.filter((t) => t.title.toLowerCase().includes(q)) : g.tasks,
      }))
      .filter((g) => g.tasks.length > 0 || matchesInitiativeSearch(g.title, search));
  }, [catalog, search]);

  const standaloneTasks = useMemo(() => {
    if (!catalog) return [];
    return filterCatalogBySearch(search, catalog.standaloneGroup.tasks);
  }, [catalog, search]);

  const selectedCount = selectedIds.size;

  const clearSelection = () => {
    setSelectedIds(new Set());
    setInfo(null);
    setError(null);
  };

  const toggleTask = (task: SprintPlanningTaskDto) => {
    if (!task.selectable) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
  };

  const toggleGroupExpanded = (initiativeId: string) => {
    setExpandedInitiatives((prev) => {
      const next = new Set(prev);
      if (next.has(initiativeId)) next.delete(initiativeId);
      else next.add(initiativeId);
      return next;
    });
  };

  const submitSelection = () => {
    if (submittingRef.current || pending || selectedCount === 0) return;
    setError(null);
    setInfo(null);
    submittingRef.current = true;
    startTransition(async () => {
      try {
        const result = await clubDevelopmentFetchJson<BulkAddResponse>(
          `/api/club-development/sprints/${sprintId}/tasks/bulk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskIds: [...selectedIds] }),
          },
        );
        if (!result.ok) {
          setError(result.message);
          return;
        }
        const data = result.data;
        if (data.partial) {
          setInfo(data.error ?? `${data.addedCount ?? 0} Aufgabe(n) hinzugefügt.`);
        } else {
          setInfo(`${data.addedCount ?? selectedCount} Aufgabe(n) zum Sprint hinzugefügt.`);
        }
        setSelectedIds(new Set());
        setExpanded(false);
        onAdded();
      } finally {
        submittingRef.current = false;
      }
    });
  };

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4" data-testid="sprint-bulk-planning-panel">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left text-sm font-medium text-[var(--foreground)] disabled:opacity-50"
        aria-expanded={expanded}
      >
        <span>Aufgaben hinzufügen</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="mt-3 space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs text-[var(--muted)]">
            Vorhaben und Aufgaben auswählen — es wird nur die Aufgabe dem Sprint zugeordnet, nicht das
            Vorhaben selbst.
          </p>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Vorhaben oder Aufgaben suchen …"
              disabled={disabled || pending}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-9 pr-3 text-sm"
              data-testid="sprint-bulk-planning-search"
            />
          </div>

          {error ? <ClubDevelopmentFormError message={error} /> : null}
          {info ? (
            <p className="text-xs text-[var(--sce-success)]" role="status">
              {info}
            </p>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Kandidaten werden geladen …
            </div>
          ) : null}

          {!loading && catalog ? (
            <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {filteredGroups.map((group) => (
                <InitiativePlanningGroup
                  key={group.initiativeId}
                  group={group}
                  expanded={expandedInitiatives.has(group.initiativeId)}
                  onToggleExpand={() => toggleGroupExpanded(group.initiativeId)}
                  selectedIds={selectedIds}
                  onToggleGroup={() =>
                    setSelectedIds(toggleInitiativeGroupSelection(group.tasks, selectedIds))
                  }
                  onToggleTask={toggleTask}
                />
              ))}

              <StandalonePlanningGroup
                tasks={standaloneTasks}
                expanded={standaloneExpanded}
                onToggleExpand={() => setStandaloneExpanded((v) => !v)}
                selectedIds={selectedIds}
                onToggleGroup={() =>
                  setSelectedIds(toggleInitiativeGroupSelection(standaloneTasks, selectedIds))
                }
                onToggleTask={toggleTask}
              />

              {filteredGroups.length === 0 && standaloneTasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-[var(--muted)]">Keine planbaren Aufgaben gefunden.</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3">
            <p className="text-xs text-[var(--muted)]">
              {selectedCount === 0
                ? "Keine Auswahl"
                : `${selectedCount} Aufgabe${selectedCount === 1 ? "" : "n"} ausgewählt`}
            </p>
            <button
              type="button"
              disabled={selectedCount === 0 || pending || disabled}
              onClick={submitSelection}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--sce-primary)] bg-[var(--sce-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {selectedCount > 0
                ? `${selectedCount} Aufgaben zum Sprint hinzufügen`
                : "Zum Sprint hinzufügen"}
            </button>
            <button
              type="button"
              disabled={pending || selectedCount === 0}
              onClick={clearSelection}
              className="text-xs text-[var(--muted)] underline hover:text-[var(--foreground)] disabled:opacity-50"
            >
              Auswahl leeren
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setExpanded(false);
                setError(null);
              }}
              className="text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InitiativePlanningGroup({
  group,
  expanded,
  onToggleExpand,
  selectedIds,
  onToggleGroup,
  onToggleTask,
}: {
  group: SprintPlanningCatalogDto["initiativeGroups"][number];
  expanded: boolean;
  onToggleExpand: () => void;
  selectedIds: Set<string>;
  onToggleGroup: () => void;
  onToggleTask: (task: SprintPlanningTaskDto) => void;
}) {
  const state = initiativeGroupSelectionState(group.tasks, selectedIds);
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = state === "partial";
    }
  }, [state]);

  return (
    <section className="rounded-lg border border-[var(--border)]" data-testid={`sprint-planning-initiative-${group.initiativeId}`}>
      <div className="flex items-start gap-2 px-3 py-2">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={state === "all"}
          disabled={group.tasks.every((t) => !t.selectable)}
          onChange={onToggleGroup}
          aria-label={`Alle auswählbaren Aufgaben der Initiative ${group.title} auswählen`}
          className="mt-1"
        />
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <span className="text-sm font-semibold text-[var(--foreground)]">{group.title}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--muted)] transition ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>
      {expanded ? (
        <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {group.tasks.map((task) => (
            <PlanningTaskRow key={task.id} task={task} checked={selectedIds.has(task.id)} onToggle={() => onToggleTask(task)} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function StandalonePlanningGroup({
  tasks,
  expanded,
  onToggleExpand,
  selectedIds,
  onToggleGroup,
  onToggleTask,
}: {
  tasks: SprintPlanningTaskDto[];
  expanded: boolean;
  onToggleExpand: () => void;
  selectedIds: Set<string>;
  onToggleGroup: () => void;
  onToggleTask: (task: SprintPlanningTaskDto) => void;
}) {
  if (tasks.length === 0) return null;
  const state = initiativeGroupSelectionState(tasks, selectedIds);
  const checkboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = state === "partial";
    }
  }, [state]);

  return (
    <section className="rounded-lg border border-[var(--border)]" data-testid="sprint-planning-standalone">
      <div className="flex items-start gap-2 px-3 py-2">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={state === "all"}
          disabled={tasks.every((t) => !t.selectable)}
          onChange={onToggleGroup}
          aria-label="Alle auswählbaren Aufgaben ohne Vorhaben auswählen"
          className="mt-1"
        />
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <span className="text-sm font-semibold text-[var(--foreground)]">Ohne Initiative</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--muted)] transition ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>
      {expanded ? (
        <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {tasks.map((task) => (
            <PlanningTaskRow key={task.id} task={task} checked={selectedIds.has(task.id)} onToggle={() => onToggleTask(task)} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function PlanningTaskRow({
  task,
  checked,
  onToggle,
}: {
  task: SprintPlanningTaskDto;
  checked: boolean;
  onToggle: () => void;
}) {
  const dueLabel = formatDueDate(task.dueAt);
  return (
    <li className="flex items-start gap-2 px-3 py-2">
      <input
        type="checkbox"
        checked={checked}
        disabled={!task.selectable}
        onChange={onToggle}
        className="mt-1"
        data-testid={`sprint-planning-task-${task.id}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--foreground)]">{task.title}</p>
        <p className="text-xs text-[var(--muted)]">
          {task.statusLabel}
          {task.assigneeLabels.length > 0 ? ` · ${task.assigneeLabels.join(", ")}` : ""}
          {dueLabel ? ` · Fällig ${dueLabel}` : ""}
        </p>
        {task.exclusionReason ? (
          <p className="mt-0.5 text-xs text-[var(--muted)]">{task.exclusionReason}</p>
        ) : null}
      </div>
    </li>
  );
}