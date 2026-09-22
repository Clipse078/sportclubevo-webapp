"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { createQuickAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { TaskReminderFields } from "./TaskReminderFields";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import TaskPeopleMultiPicker from "./TaskPeopleMultiPicker";
import TaskPriorityField from "./TaskPriorityField";

export type QuickCreateCurrentUser = {
  userId: string;
  firstName: string;
  lastName: string;
};

type Props = {
  canCreateSelf: boolean;
  canAssignOthers: boolean;
  currentUser: QuickCreateCurrentUser;
  timeZone: string;
  canOpenFullCreate?: boolean;
};

export default function MeineAufgabenQuickCreateDialog({
  canCreateSelf,
  canAssignOthers,
  currentUser,
  timeZone,
  canOpenFullCreate = false,
}: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([currentUser.userId]);

  const initialKnown = useMemo<TaskAssigneeOption[]>(
    () => [
      {
        userId: currentUser.userId,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: "",
      },
    ],
    [currentUser.firstName, currentUser.lastName, currentUser.userId],
  );

  const lockedUserIds = useMemo(() => {
    if (!canAssignOthers) return [currentUser.userId];
    if (selectedIds.length === 1 && selectedIds[0] === currentUser.userId) {
      return [currentUser.userId];
    }
    return [];
  }, [canAssignOthers, currentUser.userId, selectedIds]);

  function resetDialogState() {
    setSelectedIds([currentUser.userId]);
    setError(null);
  }

  function openDialog() {
    resetDialogState();
    setOpen(true);
    window.setTimeout(() => titleRef.current?.focus(), 0);
  }

  if (!canCreateSelf) return null;

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

  return (
    <>
      <button
        type="button"
        className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
        onClick={openDialog}
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

              <TaskPeopleMultiPicker
                label="Zugewiesen an"
                fieldName="assigneeUserIds"
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
                disabled={pending}
                allowAdd={canAssignOthers}
                lockedUserIds={lockedUserIds}
                initialKnown={initialKnown}
                addButtonLabel="Person"
                testIdPrefix="meine-aufgaben-create-assignees"
              />

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
                  <TaskPriorityField
                    disabled={pending}
                    testId="meine-aufgaben-create-priority"
                  />
                </label>
              </div>

              <TaskDescriptionFormField compact inputId="meine-aufgaben-create-description" />

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
                  >
                    Weitere Details
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
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
