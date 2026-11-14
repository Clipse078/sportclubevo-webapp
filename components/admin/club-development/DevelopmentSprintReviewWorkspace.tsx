"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import { sprintGoalResultLabel } from "@/lib/club-development/sprints/sprint-review-labels";
import type { SprintReviewViewModel } from "@/lib/club-development/sprints/sprint-review-types";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";

type Props = {
  sprintId: string;
  sprintStatus: string;
};

export default function DevelopmentSprintReviewWorkspace({ sprintId, sprintStatus }: Props) {
  const [review, setReview] = useState<SprintReviewViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await clubDevelopmentFetchJson<{ review: SprintReviewViewModel }>(
        `/api/club-development/sprints/${sprintId}/review`,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setReview(result.data.review);
    });
  }, [sprintId]);

  if (sprintStatus !== "COMPLETED") {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-10 text-center text-sm text-[var(--muted)]">
        Der Rückblick ist verfügbar, sobald der Sprint abgeschlossen ist.
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900">{error}</p>
    );
  }

  if (!review) {
    return <p className="text-sm text-[var(--muted)]">Rückblick wird geladen …</p>;
  }

  const goalLabel = sprintGoalResultLabel(review.goalResult);

  return (
    <div className="space-y-6" data-testid="sprint-review-workspace">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Sprintziel & Ergebnis</h2>
        <p className="mt-2 text-sm text-[var(--text-2)]">{review.goal?.trim() || "Kein Ziel erfasst."}</p>
        <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
          Ergebnis: {goalLabel ?? "—"}
        </p>
        {review.reviewNotes ? (
          <p className="mt-3 text-sm text-[var(--muted)] whitespace-pre-wrap">{review.reviewNotes}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Scope zum Sprintstart</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {review.committedAtStartTaskIds.length} Aufgaben im Start-Commitment ·{" "}
          {review.addedAfterStartCount} nach Start hinzugefügt
        </p>
        <TaskList tasks={review.committedAtStart} emptyLabel="Keine Commitments erfasst." />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Erledigt bei Abschluss ({review.finishedAtClose.length})
          </h2>
          <TaskList tasks={review.finishedAtClose} emptyLabel="Keine erledigten Aufgaben." historical />
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Offen bei Abschluss ({review.unfinishedAtClose.length})
          </h2>
          <ul className="mt-2 space-y-2 text-sm">
            {review.unfinishedAtClose.length === 0 ? (
              <li className="text-[var(--muted)]">Keine offenen Aufgaben.</li>
            ) : (
              review.unfinishedAtClose.map((task) => (
                <li key={task.taskId} className="flex flex-col gap-0.5">
                  <Link href={taskWorkspaceHref(task.taskId)} className="font-medium text-[var(--sce-primary)] hover:underline">
                    {task.title}
                  </Link>
                  <span className="text-xs text-[var(--muted)]">
                    Status bei Abschluss: {task.statusAtClose}
                    {task.disposition ? ` · ${dispositionLabel(task.disposition)}` : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      {review.fromSnapshot ? (
        <p className="text-xs text-[var(--muted)]">
          Historische Abschlussdaten — aktuelle Aufgabenstatus können sich unterscheiden.
        </p>
      ) : (
        <p className="text-xs text-amber-800">
          Kein Abschluss-Snapshot vorhanden — Anzeige basiert auf Metadaten ohne vollständige Historie.
        </p>
      )}
    </div>
  );
}

function dispositionLabel(disposition: string): string {
  if (disposition === "BACKLOG") return "Ins Backlog";
  if (disposition === "FUTURE_SPRINT") return "In späteren Sprint verschoben";
  if (disposition === "RETAIN_HISTORICAL") return "Im Sprint vermerkt";
  return disposition;
}

function TaskList({
  tasks,
  emptyLabel,
  historical = false,
}: {
  tasks: { taskId: string; title: string; statusAtClose?: string }[];
  emptyLabel: string;
  historical?: boolean;
}) {
  if (tasks.length === 0) {
    return <p className="mt-2 text-sm text-[var(--muted)]">{emptyLabel}</p>;
  }
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {tasks.map((task) => (
        <li key={task.taskId}>
          <Link href={taskWorkspaceHref(task.taskId)} className="text-[var(--sce-primary)] hover:underline">
            {task.title}
          </Link>
          {historical && task.statusAtClose ? (
            <span className="ml-2 text-xs text-[var(--muted)]">({task.statusAtClose})</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}