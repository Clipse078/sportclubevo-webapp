"use client";

import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { DevelopmentSprintStatus } from "@prisma/client";
import { SprintBoardQuickLink } from "./DevelopmentSprintList";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import ClubDevelopmentTaskSearchPicker from "./ClubDevelopmentTaskSearchPicker";
import SprintBulkTaskPlanningPanel from "./SprintBulkTaskPlanningPanel";

export type SprintMembershipRow = {
  membershipId: string;
  taskId: string;
  title: string;
  statusLabel: string;
  assigneeLabels: string[];
  initiativeTitle: string | null;
  addedAfterSprintStart: boolean;
};

type Props = {
  sprintId: string;
  sprintSlug: string;
  status: DevelopmentSprintStatus;
  canManage: boolean;
  initialMemberships: SprintMembershipRow[];
};

const STATUS_LABELS: Record<DevelopmentSprintStatus, string> = {
  PLANNED: "Geplant",
  ACTIVE: "Aktiv",
  COMPLETED: "Abgeschlossen",
};

export default function DevelopmentSprintDetailWorkspace({
  sprintId,
  sprintSlug,
  status,
  canManage,
  initialMemberships,
}: Props) {
  const router = useRouter();
  const [memberships, setMemberships] = useState(initialMemberships);
  const [unfinishedDisposition, setUnfinishedDisposition] = useState<"KEEP" | "REMOVE">("KEEP");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reloadMemberships = useCallback(() => {
    startTransition(async () => {
      const [memRes, boardRes] = await Promise.all([
        fetch(`/api/club-development/sprints/${sprintId}/tasks`),
        fetch(`/api/club-development/sprints/${sprintId}/board`),
      ]);
      const memData = await memRes.json().catch(() => ({}));
      const boardData = await boardRes.json().catch(() => ({}));
      if (!memRes.ok) return;
      const rows = (memData.memberships ?? []) as { id: string; taskId: string; addedAfterSprintStart: boolean }[];
      const columns = boardData.columns ?? {};
      const allCards = [
        ...(columns.OPEN ?? []),
        ...(columns.IN_PROGRESS ?? []),
        ...(columns.DONE ?? []),
      ] as {
        taskId: string;
        title: string;
        status: string;
        assignees: { displayName: string }[];
        initiativeLabel: string | null;
      }[];
      const cardByTaskId = new Map(allCards.map((c) => [c.taskId, c] as const));
      const STATUS_MAP: Record<string, string> = {
        OPEN: "Offen",
        IN_PROGRESS: "In Bearbeitung",
        DONE: "Erledigt",
        CANCELLED: "Abgebrochen",
      };
      setMemberships(
        rows.map((row) => {
          const card = cardByTaskId.get(row.taskId);
          return {
            membershipId: row.id,
            taskId: row.taskId,
            title: card?.title ?? "Aufgabe",
            statusLabel: card ? (STATUS_MAP[card.status] ?? card.status) : "—",
            assigneeLabels: card?.assignees.map((a) => a.displayName).filter(Boolean) ?? [],
            initiativeTitle: card?.initiativeLabel ?? null,
            addedAfterSprintStart: row.addedAfterSprintStart,
          };
        }),
      );
    });
  }, [sprintId]);

  const addTask = (taskId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/club-development/sprints/${sprintId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Aufgabe konnte nicht hinzugefügt werden.");
        return;
      }
      await reloadMemberships();
      router.refresh();
    });
  };

  const activateSprint = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/club-development/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Sprint konnte nicht gestartet werden.");
        return;
      }
      router.refresh();
    });
  };

  const removeTask = (taskId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/club-development/sprints/${sprintId}/tasks?taskId=${encodeURIComponent(taskId)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Entfernen fehlgeschlagen.");
        return;
      }
      setMemberships((prev) => prev.filter((m) => m.taskId !== taskId));
      router.refresh();
    });
  };

  const closeSprint = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/club-development/sprints/${sprintId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unfinishedDisposition }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Abschluss fehlgeschlagen.");
        return;
      }
      setMessage(
        `Sprint abgeschlossen. Erledigt: ${data.report?.finishedCount ?? 0}, offen: ${data.report?.unfinishedCount ?? 0}.`,
      );
      router.refresh();
    });
  };

  const showClosePanel = status !== "COMPLETED";
  const excludeTaskIds = memberships.map((m) => m.taskId);

  return (
    <div className="space-y-6" data-testid="sprint-detail-workspace">
      <SprintDetailTopActions
        slug={sprintSlug}
        status={status}
        canManage={canManage}
        onActivate={activateSprint}
        activatePending={pending}
      />

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Aufgaben im Sprint</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Aufgaben suchen und hinzufügen — nur Aufgaben, die Sie sehen dürfen. Neue Aufgaben im{" "}
          <Link href="/dashboard/aufgaben" className="text-[var(--sce-primary)] hover:underline">
            Aufgabenbereich
          </Link>{" "}
          anlegen.
        </p>

        {error ? (
          <p className="mt-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="mt-4 divide-y divide-[var(--border)]">
          {memberships.length === 0 ? (
            <li className="py-6 text-center text-sm text-[var(--muted)]">Noch keine Aufgaben zugeordnet.</li>
          ) : (
            memberships.map((row) => (
              <li key={row.membershipId} className="flex items-center justify-between gap-3 py-2.5">
                <SprintTaskMembershipLink row={row} />
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => removeTask(row.taskId)}
                    disabled={pending}
                    className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-red-500"
                    aria-label="Aufgabe aus Sprint entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>

        {canManage ? (
          <>
            <SprintBulkTaskPlanningPanel
              sprintId={sprintId}
              disabled={pending}
              onAdded={() => {
                void reloadMemberships();
                router.refresh();
              }}
            />
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="mb-2 text-xs font-medium text-[var(--muted)]">Einzelne Aufgabe suchen</p>
              <ClubDevelopmentTaskSearchPicker
                excludeTaskIds={excludeTaskIds}
                disabled={pending}
                onSelect={(task) => addTask(task.id)}
              />
            </div>
          </>
        ) : null}
      </section>

      {canManage && showClosePanel ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Sprint abschließen</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Status: {STATUS_LABELS[status]}. Offene Aufgaben können im Sprint verbleiben oder entfernt werden.
          </p>
          <fieldset className="mt-3 space-y-2 text-sm">
            <legend className="sr-only">Umgang mit offenen Aufgaben</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="unfinishedDisposition"
                checked={unfinishedDisposition === "KEEP"}
                onChange={() => setUnfinishedDisposition("KEEP")}
              />
              Offene Aufgaben im Sprint belassen
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="unfinishedDisposition"
                checked={unfinishedDisposition === "REMOVE"}
                onChange={() => setUnfinishedDisposition("REMOVE")}
              />
              Offene Aufgaben aus dem Sprint entfernen
            </label>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={closeSprint}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--sce-primary)] bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sprint abschließen
            </button>
            {message ? <p className="text-xs text-[var(--sce-success)]">{message}</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SprintDetailTopActions({
  slug,
  status,
  canManage,
  onActivate,
  activatePending,
}: {
  slug: string;
  status: DevelopmentSprintStatus;
  canManage: boolean;
  onActivate: () => void;
  activatePending: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SprintBoardQuickLink slug={slug} />
      <span className="text-xs text-[var(--muted)]">Aktueller Status: {STATUS_LABELS[status]}</span>
      {canManage && status === "PLANNED" ? (
        <button
          type="button"
          onClick={onActivate}
          disabled={activatePending}
          className="rounded-lg border border-[var(--sce-primary)] px-3 py-1.5 text-xs font-medium text-[var(--sce-primary)] disabled:opacity-50"
        >
          Sprint starten
        </button>
      ) : null}
    </div>
  );
}

function SprintTaskMembershipLink({ row }: { row: SprintMembershipRow }) {
  return (
    <div className="min-w-0">
      <Link
        href={taskWorkspaceHref(row.taskId)}
        className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
      >
        {row.title}
      </Link>
      <p className="text-xs text-[var(--muted)]">
        {row.statusLabel}
        {row.assigneeLabels.length > 0 ? ` · ${row.assigneeLabels.join(", ")}` : ""}
        {row.initiativeTitle ? ` · ${row.initiativeTitle}` : ""}
        {row.addedAfterSprintStart ? " · nach Sprintstart hinzugefügt" : ""}
      </p>
    </div>
  );
}
