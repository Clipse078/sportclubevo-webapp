import type { AuditOutcome } from "@/lib/audit/audit-record";
import { normalizeWorkspaceAuditActionLabel } from "@/lib/workspace/audit/workspace-audit-actions";

export type WorkspaceAuditEventDto = {
  id: string;
  action: string;
  actionLabel: string;
  outcome: AuditOutcome;
  entityType: string;
  entityId: string;
  workspaceDocumentVersionId: string | null;
  documentId: string | null;
  folderId: string | null;
  actorUserId: string | null;
  actorDisplayName: string | null;
  resourceLabel: string | null;
  createdAt: string;
  reason: string | null;
};

export type WorkspaceAuditListDto = {
  items: WorkspaceAuditEventDto[];
  nextCursor: string | null;
  pageSize: number;
};

export const WORKSPACE_AUDIT_MAX_PAGE_SIZE = 50;

export function workspaceAuditActionLabel(action: string): string {
  const normalized = normalizeWorkspaceAuditActionLabel(action);
  const labels: Record<string, string> = {
    WORKSPACE_FOLDER_CREATED: "Ordner erstellt",
    WORKSPACE_FOLDER_RENAMED: "Ordner umbenannt",
    WORKSPACE_FOLDER_MOVED: "Ordner verschoben",
    WORKSPACE_FOLDER_ARCHIVED: "Ordner archiviert",
    WORKSPACE_FOLDER_RESTORED_FROM_ARCHIVE: "Ordner aus Archiv wiederhergestellt",
    WORKSPACE_FOLDER_TRASHED: "Ordner in Papierkorb verschoben",
    WORKSPACE_FOLDER_RESTORED_FROM_TRASH: "Ordner aus Papierkorb wiederhergestellt",
    WORKSPACE_FOLDER_PERMANENTLY_DELETED: "Ordner endgültig gelöscht",
    WORKSPACE_DOCUMENT_VERSION_CREATED: "Dokumentversion hochgeladen",
    WORKSPACE_DOCUMENT_VERSION_RESTORED: "Dokumentversion wiederhergestellt",
    WORKSPACE_DOCUMENT_ARCHIVED: "Dokument archiviert",
    WORKSPACE_DOCUMENT_RESTORED_FROM_ARCHIVE: "Dokument aus Archiv wiederhergestellt",
    WORKSPACE_DOCUMENT_TRASHED: "Dokument in Papierkorb verschoben",
    WORKSPACE_DOCUMENT_RESTORED_FROM_TRASH: "Dokument aus Papierkorb wiederhergestellt",
    WORKSPACE_DOCUMENT_PERMANENTLY_DELETED: "Dokument endgültig gelöscht",
    WORKSPACE_ACCESS_POLICY_CHANGED: "Zugriffsregeln geändert",
    WORKSPACE_ACCESS_DENIED: "Zugriff verweigert",
    WORKSPACE_DOWNLOAD_DENIED: "Download verweigert",
    WORKSPACE_PREVIEW_DENIED: "Vorschau verweigert",
    TASK_DOCUMENT_LINKED: "Aufgabe mit Dokumentversion verknüpft",
    TASK_DOCUMENT_UNLINKED: "Aufgaben-Dokumentverknüpfung entfernt",
    REQUIREMENT_DOCUMENT_LINKED: "Anforderung mit Dokumentversion verknüpft",
    REQUIREMENT_DOCUMENT_UNLINKED: "Anforderungs-Dokumentverknüpfung entfernt",
  };
  return labels[normalized] ?? normalized;
}
