"use client";

import { useState, useTransition } from "react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type { TaskDto, TaskProgressDto } from "@/lib/tasks/types";
import {
  assignAufgabeAction,
  completeAufgabeAction,
  createAufgabeAction,
  createSubtaskAction,
  createWeeklySeriesAction,
  generateSeriesOccurrencesAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";

type TaskTree = {
  task: TaskDto;
  subtasks: TaskDto[];
  progress: TaskProgressDto;
};

type Props = {
  taskTrees: TaskTree[];
  assigneeOptions: TaskAssigneeOption[];
  tenantTimezone: string;
  canCreate: boolean;
  canAssign: boolean;
  canManageSeries: boolean;
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Niedrig",
  NORMAL: "Normal",
  HIGH: "Hoch",
  URGENT: "Dringend",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Bearbeitung",
  DONE: "Erledigt",
  CANCELLED: "Abgebrochen",
};

export function AufgabenProofPanel({
  taskTrees,
  assigneeOptions,
  tenantTimezone,
  canCreate,
  canAssign,
  canManageSeries,
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? "Gespeichert." : result.message ?? "Fehler");
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {message ? (
        <p className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      {canCreate ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="text-base font-semibold">Neue Aufgabe</h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            action={(formData) => runAction(() => createAufgabeAction(formData))}
          >
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium">Titel</span>
              <input name="title" required className="rounded-md border border-[var(--border)] px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium">Beschreibung (optional)</span>
              <textarea name="description" rows={2} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Priorität</span>
              <select name="priority" defaultValue="NORMAL" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">
                {(Object.keys(PRIORITY_LABELS) as TaskPriority[]).map((key) => (
                  <option key={key} value={key}>{PRIORITY_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Fällig am</span>
              <input type="date" name="dueAt" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm" />
            </label>
            {canAssign ? (
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-sm font-medium">Zuweisen an</span>
                <select name="assigneeUserId" defaultValue="" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">
                  <option value="">— optional —</option>
                  {assigneeOptions.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-60">
                Aufgabe erstellen
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {canManageSeries ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <h2 className="text-base font-semibold">Wöchentliche Serie (Proof)</h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" action={(formData) => runAction(() => createWeeklySeriesAction(formData))}>
            <input type="hidden" name="timezone" value={tenantTimezone} />
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium">Serientitel</span>
              <input name="title" required className="rounded-md border border-[var(--border)] px-3 py-2 text-sm" placeholder="Wochenplan prüfen und aktualisieren" />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-sm font-medium">Verantwortliche/r</span>
              <select name="assigneeUserId" defaultValue="" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">
                <option value="">— optional —</option>
                {assigneeOptions.map((user) => (
                  <option key={user.userId} value={user.userId}>{user.firstName} {user.lastName}</option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" disabled={pending} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">Serie anlegen (Sonntag)</button>
            </div>
          </form>
          <form className="mt-3" action={(formData) => runAction(() => generateSeriesOccurrencesAction(formData))}>
            <button type="submit" disabled={pending} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">
              Vorkommen generieren (alle aktiven Serien)
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="text-base font-semibold">Sichtbare Aufgaben</h2>
        {taskTrees.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">Keine Aufgaben vorhanden.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {taskTrees.map(({ task, subtasks, progress }) => (
              <li key={task.id} className="flex flex-col gap-3 py-4 first:pt-0">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    {STATUS_LABELS[task.status]} · {PRIORITY_LABELS[task.priority]}
                    {task.dueAt ? ` · Fällig ${new Date(task.dueAt).toLocaleDateString("de-CH")}` : ""}
                  </p>
                  {progress.totalCount > 0 ? (
                    <p className="mt-1 text-xs font-medium text-[var(--muted-foreground)]">
                      {progress.label} ({progress.percent}%)
                    </p>
                  ) : null}
                </div>

                {subtasks.length > 0 ? (
                  <ul className="ml-3 border-l border-[var(--border)] pl-3">
                    {subtasks.map((sub) => (
                      <li key={sub.id} className="py-2">
                        <p className="text-sm font-medium">{sub.title}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {STATUS_LABELS[sub.status]}
                          {sub.dueAt ? ` · ${new Date(sub.dueAt).toLocaleDateString("de-CH")}` : ""}
                        </p>
                        {sub.status !== "DONE" && sub.status !== "CANCELLED" ? (
                          <form className="mt-1" action={(formData) => runAction(() => completeAufgabeAction(formData))}>
                            <input type="hidden" name="taskId" value={sub.id} />
                            <button type="submit" disabled={pending} className="text-xs underline">Subtask erledigen</button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {canCreate ? (
                  <form className="grid gap-2 rounded-md border border-dashed border-[var(--border)] p-3" action={(formData) => runAction(() => createSubtaskAction(formData))}>
                    <input type="hidden" name="parentTaskId" value={task.id} />
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Subtask hinzufügen</span>
                    <input name="title" required placeholder="Titel" className="rounded-md border border-[var(--border)] px-2 py-1 text-sm" />
                    <input type="date" name="dueAt" className="rounded-md border border-[var(--border)] px-2 py-1 text-sm" />
                    {canAssign ? (
                      <select name="assigneeUserId" defaultValue="" className="rounded-md border border-[var(--border)] px-2 py-1 text-sm">
                        <option value="">Assignee optional</option>
                        {assigneeOptions.map((user) => (
                          <option key={user.userId} value={user.userId}>{user.firstName} {user.lastName}</option>
                        ))}
                      </select>
                    ) : null}
                    <button type="submit" disabled={pending} className="w-fit rounded-md border border-[var(--border)] px-3 py-1 text-xs">Subtask speichern</button>
                  </form>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {task.status !== "DONE" && task.status !== "CANCELLED" ? (
                    <form action={(formData) => runAction(() => completeAufgabeAction(formData))}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button type="submit" disabled={pending} className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium">
                        Parent erledigen
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
