"use client";

import type { TaskContextType } from "@prisma/client";
import type { TaskContextPresentation } from "@/lib/tasks/context-resolution";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { Dialog } from "@/components/ui/Dialog";
import ContextualTaskCreateFormBody from "./ContextualTaskCreateFormBody";
import { useContextualTaskCreateForm } from "./useContextualTaskCreateForm";

export type ContextualTaskCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextType: TaskContextType;
  contextId: string;
  presentation: TaskContextPresentation | null;
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  tenantWideVisibility: boolean;
  returnHref?: string;
};

export default function ContextualTaskCreateDialog({
  open,
  onOpenChange,
  contextType,
  contextId,
  presentation,
  orgUnitOptions,
  timeZone,
  tenantWideVisibility,
}: ContextualTaskCreateDialogProps) {
  void tenantWideVisibility;

  const {
    error,
    title,
    setTitle,
    pending,
    assigneeUserIds,
    setAssigneeUserIds,
    formRef,
    onSubmit,
    fieldsKey,
  } = useContextualTaskCreateForm({
    contextType,
    contextId,
    successMode: "navigate",
    onCreated: () => onOpenChange(false),
  });

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) {
          onOpenChange(false);
        }
      }}
      title="Aufgabe erstellen"
      description="Kontext ist fest mit dieser Entität verknüpft."
      size="standard"
      footer={
        <button
          type="submit"
          form="contextual-task-create-form"
          className="fca-button-primary w-full text-sm sm:w-auto sm:min-w-[12rem]"
          disabled={pending}
          data-testid="contextual-task-create-submit"
        >
          {pending ? "Erstellen …" : "Aufgabe erstellen"}
        </button>
      }
    >
      <ContextualTaskCreateFormBody
        formId="contextual-task-create-form"
        formRef={formRef}
        contextType={contextType}
        presentation={presentation}
        orgUnitOptions={orgUnitOptions}
        timeZone={timeZone}
        title={title}
        onTitleChange={setTitle}
        assigneeUserIds={assigneeUserIds}
        onAssigneeUserIdsChange={setAssigneeUserIds}
        pending={pending}
        error={error}
        fieldsKey={fieldsKey}
        onSubmit={onSubmit}
        testIdPrefix="contextual-task-create-dialog"
        peoplePickerHost="sheet"
      />
    </Dialog>
  );
}
