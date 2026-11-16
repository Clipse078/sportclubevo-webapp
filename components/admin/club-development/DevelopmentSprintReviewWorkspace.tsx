"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import { sprintGoalResultLabel } from "@/lib/club-development/sprints/sprint-review-labels";
import type { SprintReviewViewModel } from "@/lib/club-development/sprints/sprint-review-types";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import { CD_SPRINT_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { sprintReviewUnavailableCopy } from "@/lib/club-development/sprint-workspace-chrome";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";

type Props = {
  sprintId: string;
  sprintStatus: string;
};

export default function DevelopmentSprintReviewWorkspace({ sprintId, sprintStatus }: Props) {
  const [review, setReview] = useState<SprintReviewViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (sprintStatus !== "COMPLETED") return;
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
  }, [sprintId, sprintStatus]);

  if (sprintStatus !== "COMPLETED") {
    return (
      <SceClubDevelopmentEmptyState
        message={sprintReviewUnavailableCopy(sprintStatus)}
        testId="sprint-review-unavailable"
      />
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
        {error}
      </p>
    );
  }

  if (!review) {
    return <p className="text-sm text-[var(--muted)]">Rückblick wird geladen …</p>;
  }

  const goalLabel = sprintGoalResultLabel(review.goalResult);

  return (
    <div className="space-y-6" data-testid="sprint-review-workspace">
      <SceClubDevelopmentSectionShell title="Ziel & Ergebnis" bodyClassName="p-5 space-y-3">
        <p className="text-sm text-[var(--text-2)]">
          {review.goal?.trim() || CD_SPRINT_WORKSPACE_COPY.noGoalRecorded}
        </p>
        <p className="text-sm font-medium text-[var(--foreground)]">Ergebnis: {goalLabel ?? "—"}</p>
        {review.reviewNotes ? (
          <p className="text-sm text-[var(--muted)] whitespace-pre-wrap">{review.reviewNotes}</p>
        ) : null}
      </SceClubDevelopmentSectionShell>

      <SceClubDevelopmentSectionShell
        title={CD_SPRINT_WORKSPACE_COPY.scopeAtStart}
        bodyClassName="p-5 space-y-3"
      >
        <p className="text-xs text-[var(--muted)]">
          {review.committedAtStartTaskIds.length} Aufgaben zum Start eingeplant ·{" "}
          {review.addedAfterStartCount} nach Start hinzugefügt
        </p>
        <TaskList tasks={review.committedAtStart} emptyLabel="Keine Aufgaben zum Start eingeplant." />
      </SceClubDevelopmentSectionShell>

      <div className="grid gap-4 lg:grid-cols-2">
        <SceClubDevelopmentSectionShell
          title={`Erledigt bei Abschluss (${review.finishedAtClose.length})`}
          bodyClassName="p-5 space-y-3"
        >
          <TaskList tasks={review.finishedAtClose} emptyLabel="Keine erledigten Aufgaben." historical />
        </SceClubDevelopmentSectionShell>
        <SceClubDevelopmentSectionShell
          title={`Offen bei Abschluss (${review.unfinishedAtClose.length})`}
          bodyClassName="p-5 space-y-3"
        >
          <ul className="space-y-2 text-sm">
            {review.unfinishedAtClose.length === 0 ? (
              <li className="text-[var(--muted)]">Keine offenen Aufgaben.</li>
            ) : (
              review.unfinishedAtClose.map((task) => (
                <li key={task.taskId} className="flex flex-col gap-0.5">
                  <Link
                    href={taskWorkspaceHref(task.taskId)}
                    className="font-medium text-[var(--sce-primary)] hover:underline"
                  >
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
        </SceClubDevelopmentSectionShell>
      </div>

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
  if (disposition === "FUTURE_SPRINT") return `In ${CD_SPRINT_WORKSPACE_COPY.futurePhase} verschoben`;
  if (disposition === "RETAIN_HISTORICAL") return "In Umsetzungsphase vermerkt";
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
    return <p className="text-sm text-[var(--muted)]">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
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