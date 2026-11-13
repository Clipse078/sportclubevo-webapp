"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import AufgabenQuickCreateCollapsibleShell from "./AufgabenQuickCreateCollapsibleShell";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

type Props = {
  canCreate: boolean;
  canManage?: boolean;
  assigneeOptions: TaskAssigneeOption[];
  triggerLabel?: string;
  triggerTestId?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  hideTrigger?: boolean;
  inlineFlow?: boolean;
};

const FORM_ID = "aufgaben-quick-create-form";

export default function AufgabenQuickCreateDialog({
  canCreate,
  canManage = false,
  triggerLabel = "Aufgabe",
  triggerTestId = "aufgaben-create-open",
  expanded: controlledExpanded,
  onExpandedChange,
  hideTrigger = false,
  inlineFlow = false,
}: Props) {
  const router = useRouter();
  const [internalExpanded, setInternalExpanded] = useState(inlineFlow);
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = onExpandedChange ?? setInternalExpanded;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [fieldsKey, setFieldsKey] = useState(0);

  useEffect(() => {
    if (expanded) {
      const frame = window.requestAnimationFrame(() => {
        const title = document.querySelector<HTMLInputElement>(
          '[data-testid="aufgaben-create-title"]',
        );
        title?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [expanded]);

  if (!canCreate) return null;

  function clearDraft() {
    setAssigneeIds([]);
    setError(null);
    setFieldsKey((k) => k + 1);
  }

  function handleCancel() {
    if (pending) return;
    clearDraft();
    setExpanded(false);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("assigneeUserIds", assigneeIds.join(","));
    startTransition(async () => {
      const result = await createAufgabeAction(formData);
      if (result.ok) {
        clearDraft();
        setExpanded(false);
        if (result.taskId) {
          router.push(taskWorkspaceHref(result.taskId));
        } else {
          router.refresh();
        }
        return;
      }
      setError(result.message);
    });
  }

  const showInlineCard = inlineFlow || expanded;

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
          onClick={() => setExpanded(true)}
          data-testid={triggerTestId}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {triggerLabel}
        </button>
      ) : null}

      {showInlineCard ? (
        <AufgabenQuickCreateCollapsibleShell
          title="Neue Aufgabe"
          expanded={expanded}
          onExpandedChange={setExpanded}
          panelDomId="aufgaben-quick-create-panel"
          cardTestId="aufgaben-create-inline-card"
          collapseToggleTestId="aufgaben-create-collapse"
          footer={
            <>
              <div className="mr-auto flex flex-col gap-1">
                <Link
                  href={taskCreateHref()}
                  className="text-xs font-medium text-[var(--primary)] hover:underline"
                  onClick={() => setExpanded(false)}
                  data-testid="aufgaben-create-more-details"
                >
                  Weitere Details
                </Link>
                {canManage ? (
                  <Link
                    href={taskSeriesCreateHref()}
                    className="text-xs font-medium text-[var(--primary)] hover:underline"
                    onClick={() => setExpanded(false)}
                    data-testid="aufgaben-create-recurring"
                  >
                    Wiederkehrende Aufgabe erstellen
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                className={workspaceGhostButtonClass}
                onClick={handleCancel}
                disabled={pending}
                data-testid="aufgaben-create-cancel"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                form={FORM_ID}
                className={workspacePrimaryButtonClass}
                disabled={pending}
                data-testid="aufgaben-create-submit"
              >
                {pending ? "Speichern …" : "Erstellen"}
              </button>
            </>
          }
        >
          {error ? (
            <p
              className="mb-3 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <form key={fieldsKey} id={FORM_ID} action={onSubmit} className="space-y-3">
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
        </AufgabenQuickCreateCollapsibleShell>
      ) : null}
    </>
  );
}
