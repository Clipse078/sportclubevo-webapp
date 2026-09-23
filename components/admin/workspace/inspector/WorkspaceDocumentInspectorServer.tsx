import { loadWorkspaceDocumentInspectorPayload } from "@/lib/workspace/document-inspector/load-workspace-document-inspector";
import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import { WorkspaceDocumentInspectorView } from "./WorkspaceDocumentInspectorView";

type Props = {
  tenantId: string;
  document: WorkspaceDocumentListItemDto;
  folderName: string;
  locale: string;
  timeZone: string;
  tenantCanDelete?: boolean;
};

export default async function WorkspaceDocumentInspectorServer({
  tenantId,
  document,
  folderName,
  locale,
  timeZone,
  tenantCanDelete = false,
}: Props) {
  const payload = await loadWorkspaceDocumentInspectorPayload({
    tenantId,
    document,
    folderName,
    locale,
    timeZone,
    tenantCanDelete,
  });

  return <WorkspaceDocumentInspectorView payload={payload} />;
}
