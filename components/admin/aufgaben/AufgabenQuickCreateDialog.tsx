"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { createAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import {
  taskCreateHref,
  taskSeriesCreateHref,
  taskWorkspaceHref,
} from "@/lib/tasks/task-navigation";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import TaskPeopleMultiPicker from "./TaskPeopleMultiPicker";
import TaskPriorityField from "./TaskPriorityField";
import { AufgabenFormDialogShell } from "./AufgabenFormDialogShell";

type Props = {
  canCreate: boolean;
  canManage?: boolean;
  assigneeOptions: TaskAssigneeOption[];
  triggerLabel?: string;
  triggerTestId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

const FORM_ID = "aufgaben-quick-create-form";

export default function AufgabenQuickCreateDialog({
  canCreate,
  canManage = false,
  triggerLabel = "Aufgabe",
  triggerTestId = "aufgaben-create-open",
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

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
      {!hideTrigger ? (
        <button
          type="button"
          className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
          onClick={() => setOpen(true)}
          data-testid={triggerTestId}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {triggerLabel}
        </button>
      ) : null}

      <AufgabenFormDialogShell
        open={open}
        onClose={() => !pending && setOpen(false)}
        title="Neue Aufgabe"
        description="Eine Arbeit, die erledigt werden muss."
        testId="aufgaben-create-dialog"
        footer={
          <>
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
              form={FORM_ID}
              className="fca-button-primary text-sm"
              disabled={pending}
              data-testid="aufgaben-create-submit"
            >
              {pending ? "Speichern …" : "Erstellen"}
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
            <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
            <input
              name="title"
              required
              className="fca-input w-full text-sm"
              data-testid="aufgaben-create-title"
            />
          </label>

          <TaskPeopleMultiPicker
            label="Verantwortlich"
            fieldName="assigneeUserIds"
            selectedIds={assigneeIds}
            onSelectedIdsChange={setAssigneeIds}
            disabled={pending}
            testIdPrefix="aufgaben-quick-create-assignees"
          />

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
              <TaskPriorityField disabled={pending} testId="aufgaben-quick-create-priority" />
            </label>
          </div>

          <TaskDescriptionFormField optional compact inputId="aufgaben-quick-create-description" />
        </form>
      </AufgabenFormDialogShell>
    </>
  );
}
