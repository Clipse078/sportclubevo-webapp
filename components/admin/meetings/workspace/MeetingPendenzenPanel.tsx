"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { SceExpandablePanel } from "@/components/sce/page/SceExpandablePanel";
import {
  MeetingWorkspacePeopleField,
  personDisplayLabel,
} from "@/components/admin/meetings/workspace/MeetingWorkspacePeopleField";
import type { PersonPickerResult } from "@/components/shared/PeoplePicker";
import { meetingWorkspaceApi } from "@/lib/meetings/meeting-workspace-mutations";
import type { MeetingSubEntities } from "@/lib/meetings/queries";
import {
  filterPendenzen,
  formatOpenPendenzenCountLabel,
  mergeMeetingPendenzen,
  type PendenzListFilter,
  type PendenzListItem,
} from "@/lib/meetings/meeting-pendenzen";
import { MEETING_ACTION_STATUS_LABEL } from "@/lib/meetings/meeting-protocol-labels";
import { MeetingActionRow } from "@/components/admin/meetings/workspace/MeetingWorkspaceSections";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import {
  workspaceGhostButtonClass,
  workspaceInputClass,
  workspacePrimaryButtonClass,
} from "./meetingWorkspaceFieldClasses";

type MeetingAction = MeetingSubEntities["actions"][number];

type SerializedPendenz = Omit<PendenzListItem, "meetingDate" | "deadline"> & {
  meetingDate: string;
  deadline: string | null;
};

type Props = {
  meetingId: string;
  meetingTitle: string;
  meetingSlug: string;
  meetingDate: Date;
  canManage: boolean;
  actions: MeetingAction[];
  onActionsChange: (actions: MeetingAction[]) => void;
  relatedTasksCreateSlot?: ReactNode;
  refreshToken?: number;
  onSnapshot?: (snapshot: {
    openCount: number;
    overdueCount: number;
    items: PendenzListItem[];
  }) => void;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function TaskPendenzRow({ item }: { item: PendenzListItem }) {
  const statusClass = item.isOverdue ? "text-amber-800" : "text-[var(--text-2)]";
  return (
    <SceExpandablePanel
      defaultOpen={false}
      summary={
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-[var(--foreground)]">{item.title}</span>
          <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Aufgabe
          </span>
          <span className={`text-xs ${statusClass}`}>
            {item.statusLabel}
            {item.isOverdue ? " · Überfällig" : ""}
          </span>
          {item.ownerLabel ? <span className="text-xs text-[var(--text-2)]">{item.ownerLabel}</span> : null}
          <span className="text-xs text-[var(--text-2)]">
            Fällig: {item.deadline ? formatDate(item.deadline.toISOString()) : "—"}
          </span>
        </div>
      }
    >
      <div className="space-y-2 pt-2 text-sm text-[var(--text-2)]">
        {item.description ? <p>{item.description}</p> : null}
        {item.contextReference ? (
          <p>
            <span className="font-semibold text-[var(--muted)]">Bezug: </span>
            {item.contextReference}
          </p>
        ) : null}
        <Link
          href={taskWorkspaceHref(item.sourceId)}
          className="inline-flex text-xs font-semibold text-[#0b4aa2] hover:underline"
          data-testid={`pendenz-task-open-${item.sourceId}`}
        >
          Im Aufgaben-Center bearbeiten
        </Link>
      </div>
    </SceExpandablePanel>
  );
}

export default function MeetingPendenzenPanel({
  meetingId,
  meetingTitle,
  meetingSlug,
  meetingDate,
  canManage,
  actions,
  onActionsChange,
  relatedTasksCreateSlot,
  refreshToken = 0,
  onSnapshot,
}: Props) {
  const [items, setItems] = useState<SerializedPendenz[]>([]);
  const [filter, setFilter] = useState<PendenzListFilter>("open");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMassnahmeCreate, setShowMassnahmeCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createExpectedOutcome, setCreateExpectedOutcome] = useState("");
  const [createOwner, setCreateOwner] = useState<PersonPickerResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  const deserializeItems = useCallback((nextItems: SerializedPendenz[]) => {
    return nextItems.map((i) => ({
      ...i,
      meetingDate: new Date(i.meetingDate),
      deadline: i.deadline ? new Date(i.deadline) : null,
    }));
  }, []);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "initial") setInitialLoading(true);
      else setRefreshing(true);
      setError(null);
      try {
        const res = await fetch(`/api/meetings/${meetingId}/pendenzen`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Laden fehlgeschlagen");
        const nextItems = Array.isArray(data.items) ? data.items : [];
        setItems(nextItems);
        const deserialized = deserializeItems(nextItems);
        onSnapshot?.({
          openCount: typeof data.openCount === "number" ? data.openCount : 0,
          overdueCount: typeof data.overdueCount === "number" ? data.overdueCount : 0,
          items: deserialized,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
        if (mode === "initial") setItems([]);
      } finally {
        if (mode === "initial") setInitialLoading(false);
        else setRefreshing(false);
      }
    },
    [deserializeItems, meetingId, onSnapshot],
  );

  const firstLoad = useRef(true);
  useEffect(() => {
    const mode = firstLoad.current ? "initial" : "refresh";
    firstLoad.current = false;
    void load(mode);
  }, [load, refreshToken]);

  useEffect(() => {
    function onRefresh() {
      void load("refresh");
    }
    window.addEventListener("meeting-pendenzen-refresh", onRefresh);
    return () => window.removeEventListener("meeting-pendenzen-refresh", onRefresh);
  }, [load]);

  const mergedForDisplay = useMemo(() => {
    const tasksFromApi = deserializeItems(items).filter((i) => i.sourceKind === "AUFGABE");
    return mergeMeetingPendenzen({
      meeting: {
        id: meetingId,
        title: meetingTitle,
        slug: meetingSlug,
        meetingDate,
      },
      actions: actions.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        expectedOutcome: a.expectedOutcome,
        owner: a.owner,
        dueDate: a.dueDate,
        status: a.status,
        statusLabel: MEETING_ACTION_STATUS_LABEL[a.status],
      })),
      tasks: tasksFromApi.map((row) => ({
        id: row.sourceId,
        title: row.title,
        description: row.description,
        dueAt: row.deadline,
        status: row.status as import("@prisma/client").TaskStatus,
        statusLabel: row.statusLabel,
        assigneeLabels: row.ownerLabel ? row.ownerLabel.split(", ") : [],
        contextReference: row.contextReference,
      })),
    });
  }, [actions, deserializeItems, items, meetingDate, meetingId, meetingSlug, meetingTitle]);

  const filtered = useMemo(
    () => filterPendenzen(mergedForDisplay, filter),
    [filter, mergedForDisplay],
  );

  const openCountLabel = formatOpenPendenzenCountLabel(
    mergedForDisplay.filter((row) => !row.isTerminal).length,
  );

  function openAufgabeCreate() {
    window.dispatchEvent(new CustomEvent("meeting-open-inline-task-create"));
  }

  function addMassnahme() {
    const trimmed = createTitle.trim();
    if (!trimmed) return;
    setCreateError(null);
    startTransition(async () => {
      try {
        await meetingWorkspaceApi.actions.create(meetingId, {
          title: trimmed,
          description: createDescription.trim() || null,
          expectedOutcome: createExpectedOutcome.trim() || null,
          ownerPersonId: createOwner?.id ?? null,
          owner: createOwner ? personDisplayLabel(createOwner) : null,
        });
        const res = await fetch(`/api/meetings/${meetingId}/actions`);
        const data = await res.json();
        if (res.ok) onActionsChange(data.actions);
        setCreateTitle("");
        setCreateDescription("");
        setCreateExpectedOutcome("");
        setCreateOwner(null);
        setShowMassnahmeCreate(false);
        void load("refresh");
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  const actionById = useMemo(() => new Map(actions.map((a) => [a.id, a])), [actions]);

  return (
    <section
      id="meeting-section-pendenzen"
      className="space-y-3"
      data-testid="meeting-section-pendenzen"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Pendenzen</h2>
          <p className="text-xs text-[var(--text-2)]">{openCountLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {refreshing ? (
            <span className="inline-flex items-center gap-1 text-[var(--muted)]" aria-live="polite">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Aktualisiere…
            </span>
          ) : null}
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 font-medium ${filter === "open" ? "bg-[#0b4aa2] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}
            onClick={() => setFilter("open")}
          >
            Offen
          </button>
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1 font-medium ${filter === "all" ? "bg-[#0b4aa2] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}
            onClick={() => setFilter("all")}
          >
            Alle
          </button>
        </div>
      </div>

      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={workspaceGhostButtonClass}
            onClick={() => setShowMassnahmeCreate((v) => !v)}
            aria-expanded={showMassnahmeCreate}
            data-testid="meeting-action-create-toggle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="ml-1">Massnahme erfassen</span>
          </button>
          <button
            type="button"
            className={workspaceGhostButtonClass}
            onClick={openAufgabeCreate}
            data-testid="meeting-pendenzen-aufgabe-create-toggle"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="ml-1">Aufgabe erstellen</span>
          </button>
        </div>
      ) : null}

      {canManage && showMassnahmeCreate ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
          <input
            className={workspaceInputClass}
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="Massnahme"
          />
          <textarea
            className={workspaceInputClass}
            rows={2}
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
          />
          <textarea
            className={workspaceInputClass}
            rows={2}
            value={createExpectedOutcome}
            onChange={(e) => setCreateExpectedOutcome(e.target.value)}
            placeholder="Erwartetes Ergebnis (optional)"
          />
          <MeetingWorkspacePeopleField
            label="Verantwortliche/r (optional)"
            selected={createOwner}
            onSelect={setCreateOwner}
            onClear={() => setCreateOwner(null)}
          />
          {createError ? <p className="text-sm text-red-600">{createError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={workspaceGhostButtonClass} onClick={() => setShowMassnahmeCreate(false)}>
              Abbrechen
            </button>
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              disabled={pending || !createTitle.trim()}
              onClick={addMassnahme}
            >
              Speichern
            </button>
          </div>
        </div>
      ) : null}

      {relatedTasksCreateSlot ? <div className="min-w-0">{relatedTasksCreateSlot}</div> : null}

      {initialLoading && items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-[var(--text-2)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Pendenzen werden geladen…
        </p>
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-red-600">
          <span>{error}</span>
          <button type="button" className={workspaceGhostButtonClass} onClick={() => void load("refresh")}>
            Erneut versuchen
          </button>
        </div>
      ) : null}

      {!initialLoading && filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">Keine Pendenzen für den gewählten Filter.</p>
      ) : null}

      <div className="space-y-2">
        {filtered.map((row) => {
          if (row.sourceKind === "MASSNAHME") {
            const action = actionById.get(row.sourceId);
            if (!action) return null;
            return (
              <div key={row.dedupeKey} data-pendenz-source="massnahme" className="space-y-1">
                <span className="inline-block rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Massnahme
                </span>
                <MeetingActionRow
                  action={action}
                  meetingId={meetingId}
                  canManage={canManage}
                  onUpdated={(updated) => {
                    onActionsChange(
                      actions.map((entry) => (entry.id === action.id ? { ...entry, ...updated } : entry)),
                    );
                    void load("refresh");
                  }}
                  onRemoved={() => {
                    onActionsChange(actions.filter((entry) => entry.id !== action.id));
                    void load("refresh");
                  }}
                />
              </div>
            );
          }
          return <TaskPendenzRow key={row.dedupeKey} item={row} />;
        })}
      </div>
    </section>
  );
}
