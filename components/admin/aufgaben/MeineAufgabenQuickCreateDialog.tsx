"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { createQuickAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { TaskReminderFields } from "./TaskReminderFields";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import TaskPeopleMultiPicker from "./TaskPeopleMultiPicker";
import TaskPriorityField from "./TaskPriorityField";
import { AufgabenFormDialogShell } from "./AufgabenFormDialogShell";

export type QuickCreateCurrentUser = {
  userId: string;
  personId?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
};

type Props = {
  canCreateSelf: boolean;
  canAssignOthers: boolean;
  currentUser: QuickCreateCurrentUser;
  timeZone: string;
  canOpenFullCreate?: boolean;
  triggerLabel?: string;
  triggerTestId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

const FORM_ID = "meine-aufgaben-create-form";

export default function MeineAufgabenQuickCreateDialog({
  canCreateSelf,
  canAssignOthers,
  currentUser,
  timeZone,
  canOpenFullCreate = false,
  triggerLabel = "Aufgabe",
  triggerTestId = "meine-aufgaben-create-open",
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([currentUser.userId]);

  const initialKnown = useMemo<TaskAssigneeOption[]>(
    () => [
      {
        personId: currentUser.personId,
        userId: currentUser.userId,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: "",
        displayName:
          currentUser.displayName ||
          `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      },
    ],
    [
      currentUser.firstName,
      currentUser.lastName,
      currentUser.personId,
      currentUser.userId,
      currentUser.displayName,
    ],
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
      {!hideTrigger ? (
        <button
          type="button"
          className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
          onClick={openDialog}
          data-testid={triggerTestId}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {triggerLabel}
        </button>
      ) : null}

      <AufgabenFormDialogShell
        open={open}
        onClose={closeDialog}
        title="Neue Aufgabe"
        description="Eine Arbeit, die erledigt werden muss."
        testId="meine-aufgaben-create-dialog"
        footer={
          <>
            {canOpenFullCreate ? (
              <Link
                href="/dashboard/aufgaben/neu"
                className="mr-auto text-xs font-medium text-[var(--primary)] hover:underline"
                onClick={() => setOpen(false)}
              >
                Weitere Details
              </Link>
            ) : (
              <span className="mr-auto" />
            )}
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
              form={FORM_ID}
              className="fca-button-primary text-sm"
              disabled={pending}
              data-testid="meine-aufgaben-create-submit"
            >
              Erstellen
            </button>
          </>
        }
      >
        {error ? (
          <p className="mb-3 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <form id={FORM_ID} action={onSubmit} className="space-y-3">
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
        </form>
      </AufgabenFormDialogShell>
    </>
  );
}
