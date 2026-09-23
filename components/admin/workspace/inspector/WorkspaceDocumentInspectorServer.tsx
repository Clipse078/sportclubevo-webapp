import { loadWorkspaceDocumentInspectorPayload } from "@/lib/workspace/document-inspector/load-workspace-document-inspector";
import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import { WorkspaceDocumentInspectorView } from "./WorkspaceDocumentInspectorView";

type Props = {
  document: WorkspaceDocumentListItemDto;
  folderName: string;
  locale: string;
  timeZone: string;
};

export default async function WorkspaceDocumentInspectorServer({
  document,
  folderName,
  locale,
  timeZone,
}: Props) {
  const payload = await loadWorkspaceDocumentInspectorPayload({
    document,
    folderName,
    locale,
    timeZone,
  });

  return <WorkspaceDocumentInspectorView payload={payload} />;
}
