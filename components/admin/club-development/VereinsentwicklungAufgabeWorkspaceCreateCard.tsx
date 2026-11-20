"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TaskContextType } from "@prisma/client";
import ContextualTaskCreateFormBody from "@/components/admin/aufgaben/contextual/ContextualTaskCreateFormBody";
import { useContextualTaskCreateForm } from "@/components/admin/aufgaben/contextual/useContextualTaskCreateForm";
import type { ContextualTaskCreateViewDto } from "@/lib/tasks/load-contextual-task-create-view";
import ClubDevelopmentTargetSearchPicker from "./ClubDevelopmentTargetSearchPicker";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";
import SceClubDevelopmentContextualCreateCollapsibleShell from "@/components/sce/club-development/SceClubDevelopmentContextualCreateCollapsibleShell";
import { CD_VORHABEN_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import {
  workspaceGhostButtonClass,
  workspacePrimaryButtonClass,
} from "@/components/admin/meetings/workspace/meetingWorkspaceFieldClasses";

type Props = {
  canCreate: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  hideToolbarTrigger?: boolean;
  initialTargetId?: string | null;
  initialTargetTitle?: string | null;
  onCreated?: () => void;
};

const FORM_ID = "aufgaben-workspace-contextual-task-form";

export default function VereinsentwicklungAufgabeWorkspaceCreateCard({
  canCreate,
  expanded,
  onExpandedChange,
  hideToolbarTrigger = false,
  initialTargetId = null,
  initialTargetTitle = null,
  onCreated,
}: Props) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [targetId, setTargetId] = useState(initialTargetId?.trim() || "");
  const [targetTitle, setTargetTitle] = useState(initialTargetTitle?.trim() || "");
  const [createView, setCreateView] = useState<ContextualTaskCreateViewDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadView = useCallback(async (nextTargetId: string) => {
    if (!nextTargetId) {
      setCreateView(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const result = await clubDevelopmentFetchJson<{ view: ContextualTaskCreateViewDto }>(
      `/api/club-development/contextual-task-create?contextType=${TaskContextType.TARGET}&contextId=${encodeURIComponent(nextTargetId)}`,
    );
    setLoading(false);
    if (!result.ok) {
      setCreateView(null);
      setLoadError(result.message);
      return;
    }
    setCreateView(result.data.view);
  }, []);

  useEffect(() => {
    if (!expanded || !targetId) return;
    void loadView(targetId);
  }, [expanded, loadView, targetId]);

  useEffect(() => {
    if (initialTargetId?.trim()) {
      setTargetId(initialTargetId.trim());
      setTargetTitle(initialTargetTitle?.trim() || "");
    }
  }, [initialTargetId, initialTargetTitle]);

  const {
    error: formError,
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
    contextType: TaskContextType.TARGET,
    contextId: targetId,
    successMode: "refresh",
    onCreated: () => {
      onCreated?.();
      clearDraft();
      onExpandedChange(false);
    },
  });

  if (!canCreate) return null;

  return (
    <div className="w-full" data-testid="aufgaben-workspace-create-card">
      <SceClubDevelopmentContextualCreateCollapsibleShell
        actionLabel={CD_VORHABEN_WORKSPACE_COPY.createTaskAction}
        contextLabel="Zielbezug wählen oder beibehalten"
        expanded={expanded}
        onExpandedChange={onExpandedChange}
        panelDomId="aufgaben-workspace-create-panel"
        cardTestId="aufgaben-workspace-create-contextual-card"
        collapseToggleTestId="aufgaben-workspace-create-toggle"
        hideToggle={hideToolbarTrigger}
      >
        <div className="space-y-3">
          {targetId && targetTitle ? (
            <p className="text-xs text-[var(--text-2)]">
              Ziel: <span className="font-medium text-[var(--foreground)]">{targetTitle}</span>
            </p>
          ) : null}
          {!initialTargetId ? (
            <ClubDevelopmentTargetSearchPicker
              onSelect={(target) => {
                setTargetId(target.id);
                setTargetTitle(target.title);
              }}
              testId="aufgaben-workspace-target-picker"
            />
          ) : null}
          {loadError ? <ClubDevelopmentFormError message={loadError} /> : null}
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-[var(--muted)]" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Formular wird geladen …
            </p>
          ) : null}
          {createView && targetId ? (
            <>
              <ContextualTaskCreateFormBody
                formId={FORM_ID}
                formRef={formRef}
                contextType={TaskContextType.TARGET}
                presentation={createView.presentation}
                orgUnitOptions={createView.orgUnitOptions}
                timeZone={createView.timeZone}
                title={title}
                onTitleChange={setTitle}
                titleInputRef={titleInputRef}
                assigneeUserIds={assigneeUserIds}
                onAssigneeUserIdsChange={setAssigneeUserIds}
                pending={pending}
                error={formError}
                fieldsKey={fieldsKey}
                onSubmit={onSubmit}
                testIdPrefix="aufgaben-workspace-contextual"
                showContextBanner
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  form={FORM_ID}
                  className={workspacePrimaryButtonClass}
                  disabled={pending || !title.trim()}
                  data-testid="aufgaben-workspace-contextual-submit"
                >
                  {pending ? "Erstellen …" : "Aufgabe erstellen"}
                </button>
                <button
                  type="button"
                  className={workspaceGhostButtonClass}
                  disabled={pending}
                  onClick={() => {
                    clearDraft();
                    onExpandedChange(false);
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </>
          ) : !targetId ? (
            <p className="text-xs text-[var(--muted)]">Bitte ein strategisches Ziel für die Aufgabe wählen.</p>
          ) : null}
        </div>
      </SceClubDevelopmentContextualCreateCollapsibleShell>
    </div>
  );
}