"use client";

import Link from "next/link";
import { buildContextualTaskCreateHref } from "@/lib/tasks/task-create-navigation";
import { TaskContextType } from "@prisma/client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  workspaceGhostButtonClass,
  workspaceInputClass,
  workspacePrimaryButtonClass,
} from "./meetingWorkspaceFieldClasses";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  assignees: { firstName: string; lastName: string }[];
};

type Props = {
  meetingId: string;
  meetingSlug?: string;
  decisionId: string;
  decisionTitle: string;
  canManage: boolean;
};

export function MeetingDecisionTasksPanel({
  meetingId,
  meetingSlug,
  decisionId,
  decisionTitle,
  canManage,
}: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const createHref = buildContextualTaskCreateHref(
    TaskContextType.MEETING_DECISION,
    decisionId,
    {
      meetingSlug: meetingSlug ?? meetingId,
      originLabel: decisionTitle,
    },
  );
  const [linkQuery, setLinkQuery] = useState("");
  const [linkable, setLinkable] = useState<{ id: string; title: string }[]>([]);
  const [showLink, setShowLink] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/meetings/${meetingId}/decisions/${decisionId}/tasks`);
    const data = await res.json();
    if (res.ok && Array.isArray(data.tasks)) {
      setTasks(data.tasks);
    }
  }, [meetingId, decisionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!showLink || linkQuery.trim().length < 2) {
      setLinkable([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        const res = await fetch(
          `/api/meetings/${meetingId}/decisions/${decisionId}/tasks?q=${encodeURIComponent(linkQuery.trim())}`,
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data.linkable)) {
          setLinkable(data.linkable);
        }
      })();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [linkQuery, showLink, meetingId, decisionId]);

  function linkTask(taskId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}/decisions/${decisionId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "link", taskId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Fehler");
        await refresh();
        setShowLink(false);
        setLinkQuery("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler");
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Verknüpfte Aufgaben
      </p>
      {error ? (
        <p className="text-xs text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {tasks.length === 0 ? (
        <p className="text-xs text-[var(--text-2)]">Noch keine Aufgaben aus diesem Beschluss.</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((task) => {
            const assignee = task.assignees[0];
            return (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link
                  href={`/dashboard/aufgaben/${task.id}`}
                  className="font-medium text-[#0b4aa2] hover:underline"
                >
                  {task.title}
                </Link>
                <span className="text-xs text-[var(--text-2)]">
                  {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] ?? task.status}
                  {assignee
                    ? ` · ${assignee.firstName} ${assignee.lastName}`.trim()
                    : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {canManage ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={createHref} className={workspaceGhostButtonClass}>
            <Plus className="h-3.5 w-3.5" />
            Massnahme erstellen
          </Link>
          {!showLink ? (
            <button type="button" className={workspaceGhostButtonClass} onClick={() => setShowLink(true)}>
              Bestehende Aufgabe verknüpfen
            </button>
          ) : null}
        </div>
      ) : null}
      {showLink && canManage ? (
        <div className="space-y-2 pt-2">
          <input
            className={workspaceInputClass}
            value={linkQuery}
            onChange={(e) => setLinkQuery(e.target.value)}
            placeholder="Aufgabe suchen…"
          />
          {linkable.length > 0 ? (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              {linkable.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                    disabled={pending}
                    onClick={() => linkTask(row.id)}
                  >
                    {row.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" className={workspaceGhostButtonClass} onClick={() => setShowLink(false)}>
            Abbrechen
          </button>
        </div>
      ) : null}
    </div>
  );
}
