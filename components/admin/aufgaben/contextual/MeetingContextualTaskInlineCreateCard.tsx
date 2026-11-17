"use client";

import { forwardRef } from "react";
import type { ContextualTaskCreateDialogProps } from "./ContextualTaskCreateDialog";
import ContextualTaskInlineCreateCard, {
  type ContextualTaskInlineCreateCardHandle,
} from "./ContextualTaskInlineCreateCard";
import type { UseMeetingTraktandumTaskCreateFormOptions } from "@/components/admin/meetings/workspace/useMeetingTraktandumTaskCreateForm";
import { useMeetingTraktandumTaskCreateForm } from "@/components/admin/meetings/workspace/useMeetingTraktandumTaskCreateForm";
import ContextualTaskCreateFormBody from "./ContextualTaskCreateFormBody";
import { ChevronDown } from "lucide-react";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";
import { useEffect, useImperativeHandle, useRef } from "react";

export type MeetingContextualTaskInlineCreateCardHandle = ContextualTaskInlineCreateCardHandle;

type TraktandumProps = UseMeetingTraktandumTaskCreateFormOptions & {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onCreated?: () => void;
  initialTitle?: string;
  presentation: ContextualTaskCreateDialogProps["presentation"];
  orgUnitOptions: ContextualTaskCreateDialogProps["orgUnitOptions"];
  timeZone: ContextualTaskCreateDialogProps["timeZone"];
  tenantWideVisibility?: ContextualTaskCreateDialogProps["tenantWideVisibility"];
};

type LegacyProps = Omit<ContextualTaskCreateDialogProps, "open" | "onOpenChange"> & {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onCreated?: () => void;
  initialTitle?: string;
  successMode?: "refresh" | "navigate";
  meetingId?: never;
  agendaItemId?: never;
};

type Props = TraktandumProps | LegacyProps;

function isTraktandumProps(props: Props): props is TraktandumProps {
  return typeof (props as TraktandumProps).meetingId === "string";
}

const MeetingContextualTaskInlineCreateCard = forwardRef<
  MeetingContextualTaskInlineCreateCardHandle,
  Props
>(function MeetingContextualTaskInlineCreateCard(props, ref) {
  if (!isTraktandumProps(props)) {
    const { initialTitle, successMode, ...rest } = props;
    return (
      <ContextualTaskInlineCreateCard
        ref={ref}
        {...rest}
        initialTitle={initialTitle}
        successMode={successMode}
        panelDomId="meeting-contextual-task-create-panel"
        formDomId="meeting-contextual-task-create-form"
        cardTestId="meeting-contextual-task-inline-create-card"
        collapseToggleTestId="meeting-contextual-task-create-collapse"
      />
    );
  }

  const {
    expanded,
    onExpandedChange,
    onCreated,
    initialTitle,
    presentation,
    orgUnitOptions,
    timeZone,
    tenantWideVisibility,
    meetingId,
    agendaItemId,
    contextType,
    contextId,
  } = props;

  void tenantWideVisibility;
  const cardRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const {
    error,
    title,
    setTitle,
    pending,
    assigneeUserIds,
    setAssigneeUserIds,
    formRef,
    onSubmit,
    clearDraft,
    fieldsKey,
  } = useMeetingTraktandumTaskCreateForm({
    meetingId,
    agendaItemId,
    contextType,
    contextId,
    initialTitle,
    onCreated: () => {
      onCreated?.();
      onExpandedChange(false);
    },
  });

  useImperativeHandle(ref, () => ({
    focusTitle: () => titleInputRef.current?.focus(),
    scrollIntoView: () => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
  }));

  useEffect(() => {
    if (expanded) {
      const frame = window.requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        titleInputRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [expanded]);

  function handleCancel() {
    clearDraft();
    onExpandedChange(false);
  }

  return (
    <div
      ref={cardRef}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50"
      data-testid="meeting-contextual-task-inline-create-card"
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)]/60 px-3 py-2.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] rounded-md"
          aria-expanded={expanded}
          aria-controls="meeting-contextual-task-create-panel"
          onClick={() => onExpandedChange(!expanded)}
          data-testid="meeting-contextual-task-create-collapse"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Aufgabe erstellen
          </span>
        </button>
      </div>

      <div id="meeting-contextual-task-create-panel" hidden={!expanded} className="p-4">
        <ContextualTaskCreateFormBody
          formId="meeting-contextual-task-create-form"
          formRef={formRef}
          contextType={contextType}
          presentation={presentation}
          orgUnitOptions={orgUnitOptions}
          timeZone={timeZone}
          title={title}
          onTitleChange={setTitle}
          titleInputRef={titleInputRef}
          assigneeUserIds={assigneeUserIds}
          onAssigneeUserIdsChange={setAssigneeUserIds}
          pending={pending}
          error={error}
          fieldsKey={fieldsKey}
          onSubmit={onSubmit}
          testIdPrefix="meeting-contextual-task-inline-create"
          showContextBanner
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            form="meeting-contextual-task-create-form"
            className={workspacePrimaryButtonClass}
            disabled={pending || !title.trim()}
            data-testid="meeting-contextual-task-inline-submit"
          >
            {pending ? "Erstellen …" : "Aufgabe erstellen"}
          </button>
          <button
            type="button"
            className={workspaceGhostButtonClass}
            disabled={pending}
            onClick={handleCancel}
            data-testid="meeting-contextual-task-inline-cancel"
          >
            Abbrechen
          </button>
          <button
            type="button"
            className={workspaceGhostButtonClass}
            disabled={pending}
            onClick={() => onExpandedChange(false)}
            data-testid="meeting-contextual-task-inline-collapse"
          >
            Einklappen
          </button>
        </div>
      </div>
    </div>
  );
});

export default MeetingContextualTaskInlineCreateCard;