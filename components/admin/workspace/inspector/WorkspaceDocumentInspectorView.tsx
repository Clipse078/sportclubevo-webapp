"use client";

import { useCallback, useId, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWorkspaceDocumentInspectorActions } from "./WorkspaceDocumentInspectorActionsContext";

import type { WorkspaceDocumentInspectorPayloadDto } from "@/lib/workspace/document-inspector/document-inspector-dto";
import {
  formatWorkspaceDateTime,
  formatWorkspaceFileSize,
} from "@/components/admin/workspace/workspace-document-formatters";
import {
  resolveWorkspaceFileType,
} from "@/lib/workspace/file-type-util";
import { WorkspaceFileIcon } from "@/components/admin/workspace/WorkspaceFileIcon";
import { WorkspaceAccessSummaryPanel } from "@/components/admin/workspace/WorkspaceAccessSummaryPanel";
import ContextualTaskCreateTrigger from "@/components/admin/aufgaben/contextual/ContextualTaskCreateTrigger";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";
import { REQUIREMENT_STATUS_LABELS } from "@/lib/requirements/presentation";
import { WorkspaceDocumentInspectorPreview } from "./WorkspaceDocumentInspectorPreview";
import { WorkspaceDocumentRequirementCreateDialog } from "./WorkspaceDocumentRequirementCreateDialog";
import { WorkspaceVersionScanBadge } from "@/components/admin/workspace/WorkspaceVersionScanBadge";
import { useWorkspaceUploadContext } from "@/components/admin/workspace/WorkspaceUploadContext";
import { SceIcon } from "@/components/design-system/icons/SceIcon";

export type WorkspaceDocumentInspectorTab =
  | "preview"
  | "details"
  | "versions"
  | "access"
  | "tasks"
  | "requirements";

const TAB_ORDER: WorkspaceDocumentInspectorTab[] = [
  "preview",
  "details",
  "versions",
  "access",
  "tasks",
  "requirements",
];

type Props = {
  payload: WorkspaceDocumentInspectorPayloadDto;
};

export function WorkspaceDocumentInspectorView({ payload }: Props) {
  const tTabs = useTranslations("Workspace.inspector.tabs");
  const tWork = useTranslations("PlanningEditor.operational.work");

  function formatTabLabel(tab: WorkspaceDocumentInspectorTab): string {
    if (tab === "tasks" && payload.tasks.visible && !payload.tasks.loadError) {
      return tTabs("tasksWithCount", { count: payload.tasks.count });
    }
    if (tab === "requirements" && payload.requirements.visible && !payload.requirements.loadError) {
      return tTabs("requirementsWithCount", { count: payload.requirements.count });
    }
    return tTabs(tab);
  }

  const { openNewVersionFilePicker, isUploadingNewVersion } =
    useWorkspaceUploadContext();
  const {
    onManageDocumentAccess,
    onOpenVersionHistory,
    requirementCreateOpen,
    setRequirementCreateOpen,
  } = useWorkspaceDocumentInspectorActions();
  const tablistId = useId();
  const [activeTab, setActiveTab] = useState<WorkspaceDocumentInspectorTab>("preview");

  const doc = payload.document;
  const currentVersion = doc.currentVersion;
  const mimeType = currentVersion?.mimeType ?? "application/octet-stream";
  const fileTypeInfo = resolveWorkspaceFileType(mimeType, currentVersion?.filename);
  const versionLabel = currentVersion ? `v${currentVersion.versionNumber}` : "—";
  const sizeLabel = currentVersion ? formatWorkspaceFileSize(currentVersion.sizeBytes) : "—";

  const visibleTabs = TAB_ORDER.filter((tab) => {
    if (tab === "tasks") return payload.tasks.visible;
    if (tab === "requirements") return payload.requirements.visible;
    return true;
  });

  const selectTab = useCallback((tab: WorkspaceDocumentInspectorTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="workspace-document-inspector">
      <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p
              className="break-words text-sm font-semibold leading-snug text-[var(--text)]"
              title={doc.name}
            >
              {doc.name}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-2)]">
              <span>
                {sizeLabel} · {versionLabel}
                {payload.folderName ? ` · ${payload.folderName}` : null}
              </span>
              <WorkspaceVersionScanBadge scan={currentVersion?.scan} compact />
            </p>
          </div>
        </div>
      </div>

      <div
        className="shrink-0 border-b border-[var(--border)] px-3 py-2"
        role="tablist"
        id={tablistId}
        aria-label="Dokument-Inspektor"
        data-testid="workspace-document-inspector-tabs"
      >
        <div className="flex flex-wrap gap-1">
          {visibleTabs.map((tab) => {
            const selected = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`${tablistId}-tab-${tab}`}
                aria-selected={selected}
                aria-controls={`${tablistId}-panel-${tab}`}
                tabIndex={selected ? 0 : -1}
                data-testid={`workspace-document-inspector-tab-${tab}`}
                onClick={() => selectTab(tab)}
                onKeyDown={(event) => {
                  const index = visibleTabs.indexOf(tab);
                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    selectTab(visibleTabs[(index + 1) % visibleTabs.length]!);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    selectTab(visibleTabs[(index - 1 + visibleTabs.length) % visibleTabs.length]!);
                  }
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] ${
                  selected
                    ? "bg-[color-mix(in_srgb,var(--sce-accent)_14%,var(--surface))] text-[var(--text)]"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {formatTabLabel(tab)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
        {activeTab === "preview" ? (
          <div
            role="tabpanel"
            id={`${tablistId}-panel-preview`}
            aria-labelledby={`${tablistId}-tab-preview`}
            data-testid="workspace-document-inspector-panel-preview"
          >
            <WorkspaceDocumentInspectorPreview document={doc} folderName={payload.folderName} />
          </div>
        ) : null}

        {activeTab === "details" ? (
          <div
            role="tabpanel"
            id={`${tablistId}-panel-details`}
            aria-labelledby={`${tablistId}-tab-details`}
            data-testid="workspace-document-inspector-panel-details"
          >
            <dl className="space-y-3 text-sm">
              <DetailRow label="Name" value={doc.name} />
              <DetailRow label="Typ" value={fileTypeInfo.category} />
              <DetailRow label="Größe" value={sizeLabel} />
              <DetailRow label="Ordner" value={payload.folderName || "—"} />
              <DetailRow label="Aktuelle Version" value={versionLabel} />
              <DetailRow
                label="Hochgeladen von"
                value={currentVersion?.uploader.displayName ?? "—"}
              />
              <DetailRow
                label="Hochgeladen am"
                value={
                  currentVersion
                    ? formatWorkspaceDateTime(currentVersion.createdAt)
                    : "—"
                }
              />
              <div className="flex flex-col gap-1">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Sicherheitsprüfung
                </dt>
                <dd>
                  <WorkspaceVersionScanBadge scan={currentVersion?.scan} />
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {activeTab === "versions" ? (
          <div
            role="tabpanel"
            id={`${tablistId}-panel-versions`}
            aria-labelledby={`${tablistId}-tab-versions`}
            data-testid="workspace-document-inspector-panel-versions"
            className="space-y-3"
          >
            <p className="text-sm text-[var(--text-2)]">
              Aktuelle Version:{" "}
              <span className="font-medium text-[var(--text)]">{versionLabel}</span>
            </p>
            <WorkspaceVersionScanBadge scan={currentVersion?.scan} />
            {doc.canEditDocument ? (
              <button
                type="button"
                disabled={isUploadingNewVersion}
                onClick={() => openNewVersionFilePicker(doc.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--blue)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--blue-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] disabled:opacity-50"
                data-testid="workspace-document-inspector-new-version"
              >
                {isUploadingNewVersion ? "Wird hochgeladen …" : "Neue Version hochladen"}
              </button>
            ) : null}
            {onOpenVersionHistory ? (
              <button
                type="button"
                onClick={onOpenVersionHistory}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                data-testid="workspace-document-inspector-version-history"
              >
                <SceIcon name="history" size={16} className="h-4 w-4" />
                Versionsverlauf öffnen
              </button>
            ) : null}
          </div>
        ) : null}

        {activeTab === "access" ? (
          <div
            role="tabpanel"
            id={`${tablistId}-panel-access`}
            aria-labelledby={`${tablistId}-tab-access`}
            data-testid="workspace-document-inspector-panel-access"
          >
            <WorkspaceAccessSummaryPanel
              key={doc.id}
              resourceType="DOCUMENT"
              resourceId={doc.id}
              canManageAccess={doc.canManageAccess}
              onManageAccess={onManageDocumentAccess}
            />
          </div>
        ) : null}

        {activeTab === "tasks" && payload.tasks.visible ? (
          <div
            role="tabpanel"
            id={`${tablistId}-panel-tasks`}
            aria-labelledby={`${tablistId}-tab-tasks`}
            data-testid="workspace-document-inspector-panel-tasks"
            className="space-y-3"
          >
            {payload.tasks.loadError ? (
              <p className="text-sm text-[var(--text-2)]" role="alert">
                Aufgaben konnten nicht geladen werden.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    Aufgaben · {payload.tasks.count}
                  </h3>
                  {payload.tasks.canCreate && payload.tasks.createDialogProps ? (
                    <ContextualTaskCreateTrigger
                      variant="button"
                      label={tWork("createTask")}
                      className="!min-h-8 !px-2.5 !py-1 text-xs"
                      {...payload.tasks.createDialogProps}
                    />
                  ) : null}
                </div>
                {payload.tasks.tasks.length === 0 ? (
                  <p className="text-sm text-[var(--text-2)]" data-testid="document-inspector-tasks-empty">
                    Noch keine Aufgaben verknüpft.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border)]/60" data-testid="document-inspector-tasks-list">
                    {payload.tasks.tasks.map((task) => (
                      <li key={task.id}>
                        <Link
                          href={task.href}
                          className="flex flex-col gap-0.5 py-2.5 text-sm hover:bg-[var(--surface-2)]/40 -mx-2 px-2 rounded-lg"
                          data-testid="document-inspector-task-row"
                        >
                          <span className="text-xs font-medium text-[var(--muted)]">
                            {TASK_STATUS_LABELS[task.status]}
                          </span>
                          <span className="font-medium text-[var(--text)]">{task.title}</span>
                          {task.versionLabel ? (
                            <span className="text-xs text-[var(--text-2)]">{task.versionLabel}</span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ) : null}

        {activeTab === "requirements" && payload.requirements.visible ? (
          <div
            role="tabpanel"
            id={`${tablistId}-panel-requirements`}
            aria-labelledby={`${tablistId}-tab-requirements`}
            data-testid="workspace-document-inspector-panel-requirements"
            className="space-y-3"
          >
            {payload.requirements.loadError ? (
              <p className="text-sm text-[var(--text-2)]" role="alert">
                Anforderungen konnten nicht geladen werden.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    Anforderungen · {payload.requirements.count}
                  </h3>
                  {payload.requirements.canCreate ? (
                    <button
                      type="button"
                      className="fca-button-primary inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
                      data-testid="document-inspector-requirement-create"
                      onClick={() => setRequirementCreateOpen(true)}
                    >
                      + Anforderung
                    </button>
                  ) : null}
                </div>
                {payload.requirements.requirements.length === 0 ? (
                  <p
                    className="text-sm text-[var(--text-2)]"
                    data-testid="document-inspector-requirements-empty"
                  >
                    Noch keine Anforderungen verknüpft.
                  </p>
                ) : (
                  <ul
                    className="divide-y divide-[var(--border)]/60"
                    data-testid="document-inspector-requirements-list"
                  >
                    {payload.requirements.requirements.map((row) => (
                      <li key={row.requirementId}>
                        <Link
                          href={row.href}
                          className="flex flex-col gap-0.5 py-2.5 text-sm hover:bg-[var(--surface-2)]/40 -mx-2 px-2 rounded-lg"
                          data-testid="document-inspector-requirement-row"
                        >
                          <span className="text-xs font-medium text-[var(--muted)]">
                            {REQUIREMENT_STATUS_LABELS[row.status]}
                          </span>
                          <span className="font-medium text-[var(--text)]">{row.title}</span>
                          <span className="text-xs text-[var(--text-2)]">
                            Dokumentversion: {row.linkedVersionLabel}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>

      {payload.requirements.visible && payload.requirements.canCreate ? (
        <WorkspaceDocumentRequirementCreateDialog
          documentId={doc.id}
          open={requirementCreateOpen}
          onOpenChange={setRequirementCreateOpen}
        />
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[var(--text)]">{value}</dd>
    </div>
  );
}

export function WorkspaceDocumentInspectorSkeleton() {
  return (
    <div className="animate-pulse space-y-4 px-4 py-5" data-testid="workspace-document-inspector-skeleton">
      <div className="h-4 w-3/4 rounded bg-[var(--surface-2)]" />
      <div className="h-32 rounded-xl bg-[var(--surface-2)]" />
      <div className="h-3 w-full rounded bg-[var(--surface-2)]" />
      <div className="h-3 w-2/3 rounded bg-[var(--surface-2)]" />
    </div>
  );
}
