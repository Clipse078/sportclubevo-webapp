"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TaskPriority } from "@prisma/client";
import { Plus, X } from "lucide-react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { createAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import {
  taskCreateHref,
  taskSeriesCreateHref,
  taskWorkspaceHref,
} from "@/lib/tasks/task-navigation";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";

type Props = {
  canCreate: boolean;
  canManage?: boolean;
  assigneeOptions: TaskAssigneeOption[];
};

export default function AufgabenQuickCreateDialog({
  canCreate,
  canManage = false,
  assigneeOptions,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canCreate) return null;

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAufgabeAction(formData);
      if (result.ok) {
        setOpen(false);
        if (result.taskId) {
          router.push(taskWorkspaceHref(result.taskId));
        }
        return;
      }
      setError(result.message);
    });
  }

  return (
    <>
      <button
        type="button"
        className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
        onClick={() => setOpen(true)}
        data-testid="aufgaben-create-open"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Aufgabe
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          role="presentation"
          onClick={() => !pending && setOpen(false)}
          data-testid="aufgaben-create-dialog-backdrop"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aufgaben-create-title"
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="aufgaben-create-dialog"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 id="aufgaben-create-title" className="text-base font-semibold text-[var(--foreground)]">
                  Neue Aufgabe
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Titel, Verantwortliche und optional Termin & Priorität.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                onClick={() => setOpen(false)}
                aria-label="Dialog schliessen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error ? (
              <p className="mb-3 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <form action={onSubmit} className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
                <input
                  name="title"
                  required
                  className="fca-input w-full text-sm"
                  data-testid="aufgaben-create-title"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Verantwortlich</span>
                <select name="assigneeUserId" className="fca-input w-full text-sm">
                  <option value="">Optional</option>
                  {assigneeOptions.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {a.firstName} {a.lastName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-2)]">Termin</span>
                  <input
                    type="date"
                    name="dueAt"
                    className="fca-input w-full text-sm"
                    data-testid="aufgaben-create-due"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-2)]">Priorität</span>
                  <select name="priority" className="fca-input w-full text-sm" defaultValue="NORMAL">
                    {(["LOW", "NORMAL", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {TASK_PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Beschreibung (optional)</span>
                <textarea name="description" rows={2} className="fca-input w-full text-sm" />
              </label>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <div className="mr-auto flex flex-col gap-1">
                  <Link
                    href={taskCreateHref()}
                    className="text-xs font-medium text-[var(--primary)] hover:underline"
                    onClick={() => setOpen(false)}
                    data-testid="aufgaben-create-more-details"
                  >
                    Weitere Details
                  </Link>
                  {canManage ? (
                    <Link
                      href={taskSeriesCreateHref()}
                      className="text-xs font-medium text-[var(--primary)] hover:underline"
                      onClick={() => setOpen(false)}
                      data-testid="aufgaben-create-recurring"
                    >
                      Wiederkehrende Aufgabe erstellen
                    </Link>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="fca-button-secondary text-sm"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="fca-button-primary text-sm"
                  disabled={pending}
                  data-testid="aufgaben-create-submit"
                >
                  {pending ? "Speichern …" : "Erstellen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
