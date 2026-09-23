"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import type { WorkspaceFolderDto } from "@/lib/workspace/dto";
import type { DocumentInspectorWorkflowCapabilitiesDto } from "@/lib/workspace/document-inspector/document-inspector-dto";
import type { ContextualTaskCreateDialogProps } from "@/components/admin/aufgaben/contextual/ContextualTaskCreateDialog";
import {
  readStoredWorkspaceListColumns,
  readStoredWorkspaceListDensity,
  type WorkspaceListColumnPrefs,
  type WorkspaceListDensity,
} from "@/lib/workspace/ui/workspace-view-preferences";

import { WorkspaceDocumentRow } from "./WorkspaceDocumentRow";
import { WorkspaceListViewOptions } from "./WorkspaceListViewOptions";

type WorkspaceDocumentTableProps = {
  documents: WorkspaceDocumentListItemDto[];
  selectedDocumentId?: string | null;
  onSelectDocument?: (id: string) => void;
  folders?: WorkspaceFolderDto[];
  currentFolderLabel?: string;
  workflowCapabilities?: DocumentInspectorWorkflowCapabilitiesDto;
  taskCreateDialogProps?: Omit<
    ContextualTaskCreateDialogProps,
    "open" | "onOpenChange"
  > | null;
  onCreateRequirement?: () => void;
  viewOptionsSlot?: React.ReactNode;
};

export function WorkspaceDocumentTable({
  documents,
  selectedDocumentId,
  onSelectDocument,
  folders = [],
  currentFolderLabel = "",
  workflowCapabilities = { canCreateTask: false, canCreateRequirement: false },
  taskCreateDialogProps = null,
  onCreateRequirement,
  viewOptionsSlot,
}: WorkspaceDocumentTableProps) {
  const t = useTranslations("Workspace.table");
  const [density, setDensity] = useState<WorkspaceListDensity>(() =>
    readStoredWorkspaceListDensity(),
  );
  const [columns, setColumns] = useState<WorkspaceListColumnPrefs>(() =>
    readStoredWorkspaceListColumns(),
  );

  if (documents.length === 0) {
    return null;
  }

  const headerPy = density === "compact" ? "py-2" : "py-2.5";

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-end border-b border-[var(--border)] px-4 py-1.5 sm:hidden">
        {viewOptionsSlot ?? (
          <WorkspaceListViewOptions
            onDensityChange={setDensity}
            onColumnsChange={setColumns}
          />
        )}
      </div>
      <table
        className="w-full border-collapse text-left"
        role="grid"
        aria-label={t("tableAriaLabel")}
        data-density={density}
      >
        <thead>
          <tr className="border-b border-[var(--border)] text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <th className={`w-10 pl-4 pr-2 ${headerPy}`}>
              <span className="sr-only">{t("fileTypeLabel")}</span>
            </th>
            <th className={`px-2 ${headerPy}`}>{t("nameHeader")}</th>
            {columns.modified ? (
              <th className={`hidden px-4 sm:table-cell ${headerPy}`}>{t("modifiedHeader")}</th>
            ) : null}
            {columns.size ? (
              <th className={`hidden px-4 md:table-cell ${headerPy}`}>{t("sizeHeader")}</th>
            ) : null}
            {columns.version ? (
              <th className={`hidden px-4 lg:table-cell ${headerPy}`}>{t("versionHeader")}</th>
            ) : null}
            {columns.uploadedBy ? (
              <th className={`hidden px-4 xl:table-cell ${headerPy}`}>{t("uploadedByHeader")}</th>
            ) : null}
            <th className={`py-2 pl-2 pr-4 text-right ${headerPy}`}>
              <span className="sr-only">{t("actionsHeader")}</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {documents.map((document) => (
            <WorkspaceDocumentRow
              key={document.id}
              document={document}
              isSelected={selectedDocumentId === document.id}
              onSelect={onSelectDocument}
              folders={folders}
              currentFolderLabel={currentFolderLabel}
              density={density}
              columns={columns}
              workflowCapabilities={workflowCapabilities}
              taskCreateDialogProps={taskCreateDialogProps}
              onCreateRequirement={onCreateRequirement}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
