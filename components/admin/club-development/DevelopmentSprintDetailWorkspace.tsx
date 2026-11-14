"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { DevelopmentSprintStatus, TaskStatus } from "@prisma/client";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import SprintBulkTaskPlanningPanel from "./SprintBulkTaskPlanningPanel";
import SprintClosePanel from "./SprintClosePanel";
import SprintInlineTaskCreate from "./SprintInlineTaskCreate";

export type SprintMembershipRow = {
  membershipId: string;
  taskId: string;
  title: string;
  statusLabel: string;
  status: TaskStatus;
  assigneeLabels: string[];
  initiativeTitle: string | null;
  priorityLabel: string | null;
  dueLabel: string | null;
  addedAfterSprintStart: boolean;
};

type Props = {
  sprintId: string;
  sprintSlug: string;
  status: DevelopmentSprintStatus;
  canManage: boolean;
  initialMemberships: SprintMembershipRow[];
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
  const [error, setError] = useState<string | null>(null);
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
        status: TaskStatus;
        assignees: { displayName: string }[];
        initiativeLabel: string | null;
        priority: string;
        dueAt: string | null;
      }[];
      const cardByTaskId = new Map(allCards.map((c) => [c.taskId, c] as const));
      const STATUS_MAP: Record<string, string> = {
        OPEN: "Offen",
        IN_PROGRESS: "In Arbeit",
        DONE: "Erledigt",
        CANCELLED: "Abgebrochen",
      };
      setMemberships(
        rows.map((row) => {
          const card = cardByTaskId.get(row.taskId);
          const dueLabel = card?.dueAt
            ? new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
                new Date(card.dueAt),
              )
            : null;
          return {
            membershipId: row.id,
            taskId: row.taskId,
            title: card?.title ?? "Aufgabe",
            statusLabel: card ? (STATUS_MAP[card.status] ?? card.status) : "—",
            status: card?.status ?? "OPEN",
            assigneeLabels: card?.assignees.map((a) => a.displayName).filter(Boolean) ?? [],
            initiativeTitle: card?.initiativeLabel ?? null,
            priorityLabel: card?.priority ?? null,
            dueLabel,
            addedAfterSprintStart: row.addedAfterSprintStart,
          };
        }),
      );
    });
  }, [sprintId]);

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

  const planningEnabled = canManage && status !== "COMPLETED";

  return (
    <div className="space-y-6" data-testid="sprint-detail-workspace">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Aufgaben im Sprint</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Geplante Sprint-Aufgaben mit Status, Verantwortlichen und Vorhaben.
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
              <li key={row.membershipId} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <SprintTaskMembershipLink row={row} />
                {planningEnabled ? (
                  <button
                    type="button"
                    onClick={() => removeTask(row.taskId)}
                    disabled={pending}
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-red-600"
                  >
                    Aus Sprint entfernen
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>

        {planningEnabled ? (
          <>
            <SprintBulkTaskPlanningPanel
              sprintId={sprintId}
              disabled={pending}
              onAdded={() => {
                void reloadMemberships();
                router.refresh();
              }}
            />
            <SprintInlineTaskCreate
              sprintId={sprintId}
              disabled={pending}
              onCreated={() => {
                void reloadMemberships();
                router.refresh();
              }}
            />
          </>
        ) : null}
      </section>

      {canManage && status === "ACTIVE" ? (
        <SprintClosePanel
          sprintId={sprintId}
          memberships={memberships.map((m) => ({
            taskId: m.taskId,
            title: m.title,
            status: m.status,
          }))}
        />
      ) : null}

      {status === "COMPLETED" ? (
        <p className="text-sm text-[var(--muted)]">
          Abgeschlossen — Details im{" "}
          <Link
            href={`/vereinsleitung/sprints/${sprintSlug}/rueckblick`}
            className="text-[var(--sce-primary)] hover:underline"
          >
            Rückblick
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

function SprintTaskMembershipLink({ row }: { row: SprintMembershipRow }) {
  return (
    <div className="min-w-0 flex-1">
      <Link
        href={taskWorkspaceHref(row.taskId)}
        className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
      >
        {row.title}
      </Link>
      <p className="text-xs text-[var(--muted)]">
        {row.statusLabel}
        {row.priorityLabel ? ` · ${row.priorityLabel}` : ""}
        {row.assigneeLabels.length > 0 ? ` · ${row.assigneeLabels.join(", ")}` : ""}
        {row.initiativeTitle ? ` · ${row.initiativeTitle}` : ""}
        {row.dueLabel ? ` · Fällig ${row.dueLabel}` : ""}
        {row.addedAfterSprintStart ? " · nach Sprintstart hinzugefügt" : ""}
      </p>
    </div>
  );
}
