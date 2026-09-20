"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TaskPriority, TaskSeriesWeekday } from "@prisma/client";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { SCE_DIALOG_WORKSPACE_PANEL } from "@/lib/shell/responsive-layout";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";
import { createTaskSeriesAction } from "@/app/(admin)/dashboard/aufgaben/actions";

type SubtaskDraft = {
  key: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueOffsetDays: number;
  assigneeUserIds: string[];
};

type Props = {
  assigneeOptions: TaskAssigneeOption[];
  timeZone: string;
  backHref: string;
};

const WEEKDAYS: { value: TaskSeriesWeekday; label: string }[] = [
  { value: "MONDAY", label: "Montag" },
  { value: "TUESDAY", label: "Dienstag" },
  { value: "WEDNESDAY", label: "Mittwoch" },
  { value: "THURSDAY", label: "Donnerstag" },
  { value: "FRIDAY", label: "Freitag" },
  { value: "SATURDAY", label: "Samstag" },
  { value: "SUNDAY", label: "Sonntag" },
];

function newSubtask(): SubtaskDraft {
  return {
    key: crypto.randomUUID(),
    title: "",
    description: "",
    priority: "NORMAL",
    dueOffsetDays: 0,
    assigneeUserIds: [],
  };
}

export default function TaskSeriesCreateClient({ assigneeOptions, timeZone, backHref }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY">("WEEKLY");
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("frequency", frequency);
    formData.set("timezone", timeZone);
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
          .map(({ title, description, priority, dueOffsetDays, assigneeUserIds }) => ({
            title,
            description: description || null,
            priority,
            dueOffsetDays,
            assigneeUserIds,
          })),
      ),
    );

    startTransition(async () => {
      const result = await createTaskSeriesAction(formData);
      if (result.ok && result.seriesId) {
        router.push(`/dashboard/aufgaben/serien/${result.seriesId}`);
        return;
      }
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-4 sm:px-6">
      <div className={cn(SCE_DIALOG_WORKSPACE_PANEL, "min-h-[60vh] w-full")} data-testid="task-series-create">
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
          <Link
            href={backHref}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--surface-2)]"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">Wiederkehrende Aufgabe erstellen</h1>
            <p className="text-xs text-[var(--muted)]">Serien-Vorlage für automatisch erzeugte Aufgaben.</p>
          </div>
        </header>

        <form className="px-6 py-5" onSubmit={onSubmit}>
          {error ? (
            <p className="mb-4 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Titel *</span>
                <input name="title" required className="fca-input w-full" data-testid="series-create-title" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Beschreibung</span>
                <textarea name="description" rows={3} className="fca-input w-full" />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--muted)]">Unteraufgaben-Vorlagen</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-[var(--sce-primary)]"
                    onClick={() => setSubtasks((prev) => [...prev, newSubtask()])}
                    data-testid="series-add-subtask-template"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Unteraufgabe hinzufügen
                  </button>
                </div>
                {subtasks.map((sub, index) => (
                  <div
                    key={sub.key}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/30 p-3 space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        className="fca-input flex-1"
                        placeholder={`Unteraufgabe ${index + 1}`}
                        value={sub.title}
                        onChange={(e) =>
                          setSubtasks((prev) =>
                            prev.map((s) => (s.key === sub.key ? { ...s, title: e.target.value } : s)),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="rounded p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                        onClick={() => setSubtasks((prev) => prev.filter((s) => s.key !== sub.key))}
                        aria-label="Entfernen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-[var(--muted)]">
                        Fälligkeit
                        <input
                          type="number"
                          className="fca-input mt-1 w-full"
                          value={sub.dueOffsetDays}
                          onChange={(e) =>
                            setSubtasks((prev) =>
                              prev.map((s) =>
                                s.key === sub.key
                                  ? { ...s, dueOffsetDays: Number(e.target.value) || 0 }
                                  : s,
                              ),
                            )
                          }
                        />
                        <span className="text-[0.65rem]">Tage relativ zum Serientermin (− vorher, + danach)</span>
                      </label>
                      <label className="text-xs text-[var(--muted)]">
                        Priorität
                        <select
                          className="fca-input mt-1 w-full"
                          value={sub.priority}
                          onChange={(e) =>
                            setSubtasks((prev) =>
                              prev.map((s) =>
                                s.key === sub.key
                                  ? { ...s, priority: e.target.value as TaskPriority }
                                  : s,
                              ),
                            )
                          }
                        >
                          {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/25 p-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Priorität</span>
                <select name="priority" defaultValue="NORMAL" className="fca-input w-full">
                  {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Rhythmus</span>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as "WEEKLY" | "MONTHLY")}
                  className="fca-input w-full"
                >
                  <option value="WEEKLY">Wöchentlich</option>
                  <option value="MONTHLY">Monatlich</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Intervall</span>
                <input name="intervalCount" type="number" min={1} defaultValue={1} className="fca-input w-full" />
              </label>

              {frequency === "WEEKLY" ? (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--muted)]">Wochentag</span>
                  <select name="weekday" defaultValue="SUNDAY" className="fca-input w-full" required>
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--muted)]">Tag im Monat (1–28)</span>
                  <input name="monthDay" type="number" min={1} max={28} defaultValue={1} className="fca-input w-full" required />
                </label>
              )}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Start</span>
                <input name="startsOn" type="date" className="fca-input w-full" />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Fälligkeit (Uhrzeit)</span>
                <div className="flex gap-2">
                  <input name="dueHour" type="number" min={0} max={23} defaultValue={23} className="fca-input w-full" />
                  <input name="dueMinute" type="number" min={0} max={59} defaultValue={59} className="fca-input w-full" />
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--muted)]">Verantwortliche</span>
                <select
                  name="assigneeUserIds"
                  multiple
                  className="fca-input min-h-[5rem] w-full"
                  data-testid="series-create-assignees"
                >
                  {assigneeOptions.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {a.firstName} {a.lastName}
                    </option>
                  ))}
                </select>
                <span className="text-[0.65rem] text-[var(--muted)]">Mehrfachauswahl mit Strg/Cmd</span>
              </label>

              <p className="text-[0.65rem] text-[var(--muted)]">Zeitzone: {timeZone}</p>

              <button type="submit" className="fca-button-primary w-full" disabled={pending} data-testid="series-create-submit">
                {pending ? "Wird erstellt…" : "Serie erstellen"}
              </button>
            </aside>
          </div>
        </form>
      </div>
    </div>
  );
}
