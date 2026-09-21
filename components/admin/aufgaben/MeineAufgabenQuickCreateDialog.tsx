"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { TaskPriority } from "@prisma/client";
import { Plus, X } from "lucide-react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { createQuickAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { TASK_PRIORITY_LABELS } from "@/lib/tasks/management-labels";
import { TaskReminderFields } from "./TaskReminderFields";

export type QuickCreateCurrentUser = {
  userId: string;
  firstName: string;
  lastName: string;
};

type Props = {
  canCreateSelf: boolean;
  canAssignOthers: boolean;
  currentUser: QuickCreateCurrentUser;
  assigneeOptions: TaskAssigneeOption[];
  timeZone: string;
  canOpenFullCreate?: boolean;
};

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export default function MeineAufgabenQuickCreateDialog({
  canCreateSelf,
  canAssignOthers,
  currentUser,
  assigneeOptions,
  timeZone,
  canOpenFullCreate = false,
}: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([currentUser.userId]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds([currentUser.userId]);
      setAddOpen(false);
      setError(null);
      const t = window.setTimeout(() => titleRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, currentUser.userId]);

  if (!canCreateSelf) return null;

  const selectedSet = new Set(selectedIds);
  const selectedPeople = selectedIds
    .map((id) => {
      if (id === currentUser.userId) {
        return {
          userId: currentUser.userId,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
        };
      }
      return assigneeOptions.find((a) => a.userId === id);
    })
    .filter(Boolean) as TaskAssigneeOption[];

  const addableOptions = canAssignOthers
    ? assigneeOptions.filter((a) => !selectedSet.has(a.userId))
    : [];

  function closeDialog() {
    if (!pending) setOpen(false);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("assigneeUserIds", selectedIds.join(","));
    startTransition(async () => {
      const result = await createQuickAufgabeAction(formData);
      if (result.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      setError(result.message);
    });
  }

  function removeAssignee(userId: string) {
    if (!canAssignOthers) return;
    if (userId === currentUser.userId && selectedIds.length === 1) return;
    setSelectedIds((prev) => prev.filter((id) => id !== userId));
  }

  function addAssignee(userId: string) {
    if (!canAssignOthers || !userId) return;
    setSelectedIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    setAddOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
        onClick={() => setOpen(true)}
        data-testid="meine-aufgaben-create-open"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Aufgabe
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
          role="presentation"
          onClick={closeDialog}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeDialog();
          }}
          data-testid="meine-aufgaben-create-dialog-backdrop"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="meine-aufgaben-create-title"
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="meine-aufgaben-create-dialog"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="meine-aufgaben-create-title"
                  className="text-base font-semibold text-[var(--foreground)]"
                >
                  Neue Aufgabe
                </h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Schnell etwas für dich oder dein Team erfassen.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                onClick={closeDialog}
                aria-label="Dialog schliessen"
                disabled={pending}
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
                <span className="text-xs font-medium text-[var(--text-2)]">
                  Titel <span className="text-red-400">*</span>
                </span>
                <input
                  ref={titleRef}
                  name="title"
                  required
                  className="fca-input w-full text-sm"
                  data-testid="meine-aufgaben-create-title"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
              </label>

              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--text-2)]">Zugewiesen an</span>
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  data-testid="meine-aufgaben-create-assignees"
                >
                  {selectedPeople.map((person) => (
                    <span
                      key={person.userId}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 pl-1 pr-1.5 py-0.5 text-xs text-[var(--text-2)]"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-3)] text-[0.625rem] font-semibold">
                        {initials(person.firstName, person.lastName)}
                      </span>
                      {formatName(person.firstName, person.lastName)}
                      {canAssignOthers &&
                      !(person.userId === currentUser.userId && selectedIds.length === 1) ? (
                        <button
                          type="button"
                          className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-3)]"
                          aria-label={`${formatName(person.firstName, person.lastName)} entfernen`}
                          onClick={() => removeAssignee(person.userId)}
                          disabled={pending}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                  {canAssignOthers && addableOptions.length > 0 ? (
                    <div className="relative">
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--surface-2)]"
                        onClick={() => setAddOpen((v) => !v)}
                        disabled={pending}
                        data-testid="meine-aufgaben-create-add-person"
                      >
                        <Plus className="h-3 w-3" />
                        Person
                      </button>
                      {addOpen ? (
                        <div className="absolute left-0 top-full z-10 mt-1 max-h-40 w-56 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                          {addableOptions.map((a) => (
                            <button
                              key={a.userId}
                              type="button"
                              className="block w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                              onClick={() => addAssignee(a.userId)}
                            >
                              {a.firstName} {a.lastName}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-2)]">Termin</span>
                  <input
                    type="date"
                    name="dueAt"
                    className="fca-input w-full text-sm"
                    data-testid="meine-aufgaben-create-due"
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
                <span className="text-xs font-medium text-[var(--text-2)]">Beschreibung</span>
                <textarea
                  name="description"
                  rows={2}
                  className="fca-input w-full text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
              </label>

              <TaskReminderFields
                timeZone={timeZone}
                values={{
                  reminder1PresetKey: null,
                  reminder2PresetKey: null,
                  reminder1At: null,
                  reminder2At: null,
                }}
                disabled={pending}
              />

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {canOpenFullCreate ? (
                  <Link
                    href="/dashboard/aufgaben/neu"
                    className="mr-auto text-xs font-medium text-[var(--primary)] hover:underline"
                    onClick={() => setOpen(false)}
                    data-testid="meine-aufgaben-create-more-options"
                  >
                    Weitere Optionen
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="fca-button-secondary text-sm"
                  onClick={closeDialog}
                  disabled={pending}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="fca-button-primary text-sm"
                  disabled={pending}
                  data-testid="meine-aufgaben-create-submit"
                >
                  {pending ? "Erstellen …" : "Aufgabe erstellen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
