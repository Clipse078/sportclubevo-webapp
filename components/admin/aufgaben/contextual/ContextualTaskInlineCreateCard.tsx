"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { ChevronDown } from "lucide-react";
import type { ContextualTaskCreateDialogProps } from "./ContextualTaskCreateDialog";
import ContextualTaskCreateFormBody from "./ContextualTaskCreateFormBody";
import { useContextualTaskCreateForm } from "./useContextualTaskCreateForm";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

export type ContextualTaskInlineCreateCardHandle = {
  focusTitle: () => void;
  scrollIntoView: () => void;
};

type Props = Omit<ContextualTaskCreateDialogProps, "open" | "onOpenChange"> & {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onCreated?: () => void;
  panelDomId?: string;
  formDomId?: string;
  cardTestId?: string;
  collapseToggleTestId?: string;
};

const ContextualTaskInlineCreateCard = forwardRef<ContextualTaskInlineCreateCardHandle, Props>(
  function ContextualTaskInlineCreateCard(
    {
      expanded,
      onExpandedChange,
      onCreated,
      contextType,
      contextId,
      presentation,
      orgUnitOptions,
      timeZone,
      tenantWideVisibility,
      panelDomId = "contextual-task-create-panel",
      formDomId = "contextual-task-create-form",
      cardTestId = "contextual-task-inline-create-card",
      collapseToggleTestId = "contextual-task-create-collapse",
    },
    ref,
  ) {
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
    } = useContextualTaskCreateForm({
      contextType,
      contextId,
      successMode: "refresh",
      onCreated: () => {
        onCreated?.();
        onExpandedChange(false);
      },
    });

    useImperativeHandle(ref, () => ({
      focusTitle: () => {
        titleInputRef.current?.focus();
      },
      scrollIntoView: () => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      },
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

    function handleCollapse() {
      onExpandedChange(false);
    }

    return (
      <div
        ref={cardRef}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50"
        data-testid={cardTestId}
        data-expanded={expanded ? "true" : "false"}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)]/60 px-3 py-2.5">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] rounded-md"
            aria-expanded={expanded}
            aria-controls={panelDomId}
            onClick={() => onExpandedChange(!expanded)}
            data-testid={collapseToggleTestId}
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

        <div id={panelDomId} hidden={!expanded} className="p-4">
          <ContextualTaskCreateFormBody
            formId={formDomId}
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
            testIdPrefix="contextual-task-inline-create"
            peoplePickerHost="embedded"
            showContextBanner
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              form={formDomId}
              className={workspacePrimaryButtonClass}
              disabled={pending || !title.trim()}
              data-testid="contextual-task-inline-submit"
            >
              {pending ? "Erstellen …" : "Aufgabe erstellen"}
            </button>
            <button
              type="button"
              className={workspaceGhostButtonClass}
              disabled={pending}
              onClick={handleCancel}
              data-testid="contextual-task-inline-cancel"
            >
              Abbrechen
            </button>
            <button
              type="button"
              className={workspaceGhostButtonClass}
              disabled={pending}
              onClick={handleCollapse}
              data-testid="contextual-task-inline-collapse"
            >
              Einklappen
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export default ContextualTaskInlineCreateCard;
