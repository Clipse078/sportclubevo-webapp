"use client";

import type { FormEventHandler, RefObject } from "react";
import type { TaskContextPresentation } from "@/lib/tasks/context-resolution";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { taskContextTypeLabel } from "@/lib/tasks/context-registry";
import type { TaskContextType } from "@prisma/client";
import TaskOrgVisibilityFields from "../TaskOrgVisibilityFields";
import { TaskDeadlineFields } from "../TaskReminderFields";
import TaskDescriptionFormField from "../TaskDescriptionFormField";
import TaskPeopleMultiPicker from "../TaskPeopleMultiPicker";
import TaskPriorityField from "../TaskPriorityField";
import type { SceListSelectorPanelHost } from "@/components/sce/list-selector/SceListSelectorPanel";
import { cn } from "@/lib/cn";

type Props = {
  formId: string;
  formRef: RefObject<HTMLFormElement | null>;
  contextType: TaskContextType;
  presentation: TaskContextPresentation | null;
  orgUnitOptions: TaskOrgUnitPickerOption[];
  timeZone: string;
  title: string;
  onTitleChange: (value: string) => void;
  titleInputRef?: RefObject<HTMLInputElement | null>;
  assigneeUserIds: string[];
  onAssigneeUserIdsChange: (ids: string[]) => void;
  pending: boolean;
  error: string | null;
  fieldsKey: number;
  onSubmit: FormEventHandler<HTMLFormElement>;
  testIdPrefix: string;
  peoplePickerHost?: SceListSelectorPanelHost;
  titleInputClassName?: string;
  showContextBanner?: boolean;
};

export default function ContextualTaskCreateFormBody({
  formId,
  formRef,
  contextType,
  presentation,
  orgUnitOptions,
  timeZone,
  title,
  onTitleChange,
  titleInputRef,
  assigneeUserIds,
  onAssigneeUserIdsChange,
  pending,
  error,
  fieldsKey,
  onSubmit,
  testIdPrefix,
  peoplePickerHost = "sheet",
  titleInputClassName,
  showContextBanner = true,
}: Props) {
  const contextLabel = presentation?.title ?? taskContextTypeLabel(contextType);
  const contextSecondary =
    presentation?.subtitle ??
    presentation?.compactSecondary ??
    taskContextTypeLabel(contextType);

  return (
    <>
      {showContextBanner ? (
        <div
          className="mb-4 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-2)]/40 px-3 py-2.5"
          data-testid={`${testIdPrefix}-fixed-context`}
        >
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Kontext
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{contextLabel}</p>
          <p className="text-xs text-[var(--text-2)]">{contextSecondary}</p>
        </div>
      ) : null}

      {error ? (
        <p
          className="mb-3 rounded-md border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form
        id={formId}
        ref={formRef}
        onSubmit={onSubmit}
        className="space-y-4"
        data-testid={testIdPrefix}
      >
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
          <input
            ref={titleInputRef}
            name="title"
            required
            className={cn("fca-input w-full text-sm", titleInputClassName)}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            data-testid={`${testIdPrefix}-title`}
          />
        </label>

        <TaskDescriptionFormField
          key={fieldsKey}
          optional
          inputId={`${testIdPrefix}-description`}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TaskPeopleMultiPicker
            label="Verantwortlich"
            fieldName="assigneeUserIds"
            selectedIds={assigneeUserIds}
            onSelectedIdsChange={onAssigneeUserIdsChange}
            disabled={pending}
            testIdPrefix={`${testIdPrefix}-assignees`}
            panelHost={peoplePickerHost}
          />
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Priorität</span>
            <TaskPriorityField disabled={pending} testId={`${testIdPrefix}-priority`} />
          </label>
        </div>

        <TaskDeadlineFields timeZone={timeZone} dueAt={null} />

        <div className="space-y-2 border-t border-[var(--border)]/60 pt-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Organisation &amp; Sichtbarkeit
          </p>
          <TaskOrgVisibilityFields orgUnitOptions={orgUnitOptions} />
        </div>
      </form>
    </>
  );
}
