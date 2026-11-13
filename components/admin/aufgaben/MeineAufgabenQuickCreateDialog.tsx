"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import { createQuickAufgabeAction } from "@/app/(admin)/dashboard/aufgaben/actions";
import { TaskReminderFields } from "./TaskReminderFields";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import TaskPeopleMultiPicker from "./TaskPeopleMultiPicker";
import TaskPriorityField from "./TaskPriorityField";
import AufgabenQuickCreateCollapsibleShell from "./AufgabenQuickCreateCollapsibleShell";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

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
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  hideTrigger?: boolean;
  /** When true, inline card stays in page flow (collapsed until opened). */
  inlineFlow?: boolean;
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
  expanded: controlledExpanded,
  onExpandedChange,
  hideTrigger = false,
  inlineFlow = false,
}: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const [internalExpanded, setInternalExpanded] = useState(inlineFlow);
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = onExpandedChange ?? setInternalExpanded;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>([currentUser.userId]);
  const [fieldsKey, setFieldsKey] = useState(0);

  const initialKnown = useMemo<TaskAssigneeOption[]>(
    () => [
      {
        personId: currentUser.personId,
        userId: currentUser.userId,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: "",
        displayName:
          currentUser.displayName || `${currentUser.firstName} ${currentUser.lastName}`.trim(),
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

  function clearDraft() {
    setSelectedIds([currentUser.userId]);
    setError(null);
    setFieldsKey((k) => k + 1);
  }

  function openInlineCreate() {
    setExpanded(true);
  }

  useEffect(() => {
    if (expanded) {
      const frame = window.requestAnimationFrame(() => titleRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [expanded]);

  if (!canCreateSelf) return null;

  function handleCancel() {
    if (pending) return;
    clearDraft();
    setExpanded(false);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("assigneeUserIds", selectedIds.join(","));
    startTransition(async () => {
      const result = await createQuickAufgabeAction(formData);
      if (result.ok) {
        clearDraft();
        setExpanded(false);
        router.refresh();
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
          onClick={openInlineCreate}
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
          panelDomId="meine-aufgaben-create-panel"
          cardTestId="meine-aufgaben-create-inline-card"
          collapseToggleTestId="meine-aufgaben-create-collapse"
          footer={
            <>
              {canOpenFullCreate ? (
                <Link
                  href="/dashboard/aufgaben/neu"
                  className="mr-auto text-xs font-medium text-[var(--primary)] hover:underline"
                  onClick={() => setExpanded(false)}
                >
                  Weitere Details
                </Link>
              ) : (
                <span className="mr-auto" />
              )}
              <button
                type="button"
                className={workspaceGhostButtonClass}
                onClick={handleCancel}
                disabled={pending}
                data-testid="meine-aufgaben-create-cancel"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                form={FORM_ID}
                className={workspacePrimaryButtonClass}
                disabled={pending}
                data-testid="meine-aufgaben-create-submit"
              >
                {pending ? "Erstellen …" : "Erstellen"}
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
                <TaskPriorityField disabled={pending} testId="meine-aufgaben-create-priority" />
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
        </AufgabenQuickCreateCollapsibleShell>
      ) : null}
    </>
  );
}
