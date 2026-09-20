"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TaskPriority } from "@prisma/client";
import { ArrowLeft, Plus, Repeat2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type { TaskSeriesWorkspaceBundle } from "@/lib/tasks/series-workspace-service";
import {
  TASK_PRIORITY_LABELS,
  formatAssigneeName,
} from "@/lib/tasks/management-labels";
import { presentTaskDeadline } from "@/lib/tasks/management-deadline";
import { taskStatusBadgeClass, taskStatusPresentation } from "@/lib/tasks/management-presentation";
import {
  endTaskSeriesAction,
  pauseTaskSeriesAction,
  resumeTaskSeriesAction,
  updateTaskSeriesAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";

type Props = {
  bundle: TaskSeriesWorkspaceBundle;
  assigneeOptions: TaskAssigneeOption[];
  locale: string;
  timeZone: string;
  backHref: string;
};

type SubtaskDraft = {
  key: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueOffsetDays: number;
};

export default function TaskSeriesWorkspace({
  bundle,
  assigneeOptions,
  locale,
  timeZone,
  backHref,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [endConfirm, setEndConfirm] = useState(false);
  const [title, setTitle] = useState(bundle.title);
  const [description, setDescription] = useState(bundle.description ?? "");
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>(
    bundle.subtaskTemplates.map((t) => ({
      key: t.id,
      title: t.title,
      description: t.description ?? "",
      priority: t.priority,
      dueOffsetDays: t.dueOffsetDays,
    })),
  );

  function runStatusAction(action: (fd: FormData) => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("seriesId", bundle.id);
      const result = await action(fd);
      if (result.ok) router.refresh();
      else setError(result.message ?? "Aktion fehlgeschlagen.");
    });
  }

  function saveSeries(form: HTMLFormElement) {
    setError(null);
    const formData = new FormData(form);
    formData.set("seriesId", bundle.id);
    formData.set("title", title);
    formData.set("description", description);
    const assigneeSelect = form.querySelector('[name="assigneeUserIds"]') as HTMLSelectElement | null;
    if (assigneeSelect) {
      const selected = [...assigneeSelect.selectedOptions].map((o) => o.value);
      formData.set("assigneeUserIds", selected.join(","));
    }
    formData.set(
      "subtaskTemplatesJson",
      JSON.stringify(
        subtasks
          .filter((s) => s.title.trim())
          .map(({ title: t, description: d, priority, dueOffsetDays }) => ({
            title: t,
            description: d || null,
            priority,
            dueOffsetDays,
            assigneeUserIds: [],
          })),
      ),
    );

    startTransition(async () => {
      const result = await updateTaskSeriesAction(formData);
      if (result.ok) router.refresh();
      else setError(result.message);
    });
  }

  const nextLabel = bundle.nextOccurrenceDueAt
    ? presentTaskDeadline({
        dueAt: bundle.nextOccurrenceDueAt,
        status: "OPEN",
        locale,
        timeZone,
      }).label
    : "—";

  return (
    <div className="flex h-full min-h-[70vh] flex-col" data-testid="task-series-workspace">
      <header className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-6 py-4">
        <Link
          href={backHref}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--surface-2)]"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Wiederkehrende Serie</p>
          <h1 className="truncate text-lg font-semibold text-[var(--foreground)]">{bundle.title}</h1>
        </div>
        {bundle.canManage ? (
          <div className="flex flex-wrap gap-2">
            {bundle.status === "ACTIVE" ? (
              <button
                type="button"
                className="fca-button-secondary text-sm"
                disabled={pending}
                onClick={() => runStatusAction(pauseTaskSeriesAction)}
                data-testid="series-pause"
              >
                Pause
              </button>
            ) : null}
            {bundle.status === "PAUSED" ? (
              <button
                type="button"
                className="fca-button-secondary text-sm"
                disabled={pending}
                onClick={() => runStatusAction(resumeTaskSeriesAction)}
                data-testid="series-resume"
              >
                Fortsetzen
              </button>
            ) : null}
            {bundle.status !== "ENDED" ? (
              endConfirm ? (
                <div className="flex items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-950/20 px-2 py-1">
                  <span className="text-xs text-orange-100">Keine neuen Aufgaben mehr. Bestehende bleiben.</span>
                  <button
                    type="button"
                    className="text-xs font-medium text-orange-200 underline"
                    disabled={pending}
                    onClick={() => runStatusAction(endTaskSeriesAction)}
                  >
                    Serie beenden
                  </button>
                  <button type="button" className="text-xs text-[var(--muted)]" onClick={() => setEndConfirm(false)}>
                    Abbrechen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="fca-button-secondary text-sm"
                  disabled={pending}
                  onClick={() => setEndConfirm(true)}
                >
                  Serie beenden
                </button>
              )
            ) : null}
          </div>
        ) : null}
      </header>

      {error ? (
        <p className="mx-6 mt-4 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div className="space-y-6 px-6 py-5">
          {bundle.canManage ? (
            <form
              id="series-edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveSeries(e.currentTarget);
              }}
            >
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Titel</span>
                <input
                  className="fca-input w-full text-base font-semibold"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  name="title"
                />
              </label>
              <label className="mt-3 block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Beschreibung</span>
                <textarea
                  className="fca-input w-full"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  name="description"
                />
              </label>
              <p className="mt-2 text-xs text-[var(--muted)]">{bundle.editFutureNotice}</p>

              <input type="hidden" name="frequency" value={bundle.frequency} />
              <input type="hidden" name="intervalCount" value={String(bundle.intervalCount)} />
              {bundle.weekday ? <input type="hidden" name="weekday" value={bundle.weekday} /> : null}
              {bundle.monthDay != null ? (
                <input type="hidden" name="monthDay" value={String(bundle.monthDay)} />
              ) : null}
              <input type="hidden" name="dueHour" value={String(bundle.dueHour)} />
              <input type="hidden" name="dueMinute" value={String(bundle.dueMinute)} />
              <input type="hidden" name="timezone" value={bundle.timezone} />
              <input type="hidden" name="priority" value={bundle.priority} />
            </form>
          ) : (
            <div>
              <h2 className="text-base font-semibold">{bundle.title}</h2>
              {bundle.description ? (
                <p className="mt-2 text-sm text-[var(--text-2)]">{bundle.description}</p>
              ) : null}
            </div>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Unteraufgaben-Vorlagen</h3>
              {bundle.canManage ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-[var(--sce-primary)]"
                  onClick={() =>
                    setSubtasks((prev) => [
                      ...prev,
                      {
                        key: crypto.randomUUID(),
                        title: "",
                        description: "",
                        priority: "NORMAL",
                        dueOffsetDays: 0,
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Unteraufgabe hinzufügen
                </button>
              ) : null}
            </div>
            <ul className="space-y-2">
              {bundle.canManage
                ? subtasks.map((item) => (
                    <li key={item.key} className="rounded-lg border border-[var(--border)] px-3 py-2">
                      <div className="flex gap-2">
                        <input
                          className="fca-input flex-1 text-sm"
                          value={item.title}
                          onChange={(e) =>
                            setSubtasks((prev) =>
                              prev.map((s) => (s.key === item.key ? { ...s, title: e.target.value } : s)),
                            )
                          }
                        />
                        <button
                          type="button"
                          className="rounded p-1 text-[var(--muted)]"
                          onClick={() => setSubtasks((prev) => prev.filter((s) => s.key !== item.key))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)]">Offset: {item.dueOffsetDays} Tage</p>
                    </li>
                  ))
                : bundle.subtaskTemplates.map((item) => (
                    <li key={item.id} className="rounded-lg border border-[var(--border)] px-3 py-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-[var(--muted)]">{item.dueOffsetLabel}</p>
                    </li>
                  ))}
            </ul>
            {bundle.canManage ? (
              <button
                type="submit"
                form="series-edit-form"
                className="fca-button-primary mt-4 text-sm"
                disabled={pending}
                data-testid="series-save"
              >
                Änderungen speichern
              </button>
            ) : null}
          </section>

          <section data-testid="series-occurrence-history">
            <h3 className="mb-2 text-sm font-semibold">Erzeugte Aufgaben</h3>
            {bundle.occurrences.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Noch keine Aufgaben erzeugt.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                {bundle.occurrences.map(({ task, progress }) => {
                  const deadline = presentTaskDeadline({
                    dueAt: task.dueAt,
                    status: task.status,
                    locale,
                    timeZone,
                  });
                  const status = taskStatusPresentation(task.status);
                  return (
                    <li key={task.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <Link
                        href={`/dashboard/aufgaben/${task.id}`}
                        className="min-w-0 flex-1 font-medium text-[var(--sce-primary)] hover:underline"
                      >
                        {task.title}
                      </Link>
                      <span className="text-xs tabular-nums text-[var(--muted)]">{deadline.label}</span>
                      <span className={cn("rounded px-1.5 py-0.5 text-xs", taskStatusBadgeClass(task.status))}>
                        {status.label}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{progress.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {bundle.occurrencePageCount > 1 ? (
              <div className="mt-2 flex gap-2 text-sm">
                {bundle.occurrencePage > 1 ? (
                  <Link
                    href={`/dashboard/aufgaben/serien/${bundle.id}?page=${bundle.occurrencePage - 1}`}
                    className="text-[var(--sce-primary)] hover:underline"
                  >
                    Zurück
                  </Link>
                ) : null}
                <span className="text-[var(--muted)]">
                  Seite {bundle.occurrencePage} / {bundle.occurrencePageCount}
                </span>
                {bundle.occurrencePage < bundle.occurrencePageCount ? (
                  <Link
                    href={`/dashboard/aufgaben/serien/${bundle.id}?page=${bundle.occurrencePage + 1}`}
                    className="text-[var(--sce-primary)] hover:underline"
                  >
                    Weiter
                  </Link>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-3 border-t border-[var(--border)] bg-[var(--surface-2)]/20 px-4 py-5 lg:border-l lg:border-t-0">
          <PropertyRow label="Status">
            <span className="text-sm">{bundle.statusLabel}</span>
          </PropertyRow>
          <PropertyRow label="Rhythmus">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Repeat2 className="h-3.5 w-3.5 text-[var(--muted)]" />
              {bundle.recurrenceLabel}
            </span>
          </PropertyRow>
          <PropertyRow label="Nächste Aufgabe">
            <span className="text-sm tabular-nums">{nextLabel}</span>
          </PropertyRow>
          <PropertyRow label="Fälligkeit">
            <span className="text-sm">{bundle.deadlineRuleLabel}</span>
          </PropertyRow>
          <PropertyRow label="Priorität">
            <span className="text-sm">{TASK_PRIORITY_LABELS[bundle.priority]}</span>
          </PropertyRow>
          <PropertyRow label="Zeitzone">
            <span className="text-sm">{bundle.timezone}</span>
          </PropertyRow>
          <PropertyRow label="Verantwortliche">
            {bundle.canManage ? (
              <select
                name="assigneeUserIds"
                form="series-edit-form"
                multiple
                defaultValue={bundle.assigneeTemplates.map((a) => a.userId)}
                className="fca-input min-h-[4rem] w-full text-sm"
              >
                {assigneeOptions.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-[var(--text-2)]">
                {bundle.assigneeTemplates.length
                  ? bundle.assigneeTemplates
                      .map((a) => formatAssigneeName(a.firstName, a.lastName))
                      .join(", ")
                  : "—"}
              </span>
            )}
          </PropertyRow>
          <PropertyRow label="Erstellt">
            <span className="text-xs text-[var(--muted)]">
              {new Date(bundle.createdAt).toLocaleString(locale, { timeZone })}
            </span>
          </PropertyRow>
          <PropertyRow label="Aktualisiert">
            <span className="text-xs text-[var(--muted)]">
              {new Date(bundle.updatedAt).toLocaleString(locale, { timeZone })}
            </span>
          </PropertyRow>
        </aside>
      </div>
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      {children}
    </div>
  );
}
