import type { WorkspaceDocumentListItemDto } from "@/lib/workspace/document-dto";
import { loadWorkspaceVersionScanPublicDtoMap } from "@/lib/workspace/malware-scan/batch-version-scan-public-dto";

/**
 * W09-03 — attach read-only malware scan DTOs to list rows (current version only).
 */
export async function enrichWorkspaceDocumentListWithCurrentVersionScan(
  tenantId: string,
  documents: WorkspaceDocumentListItemDto[],
): Promise<WorkspaceDocumentListItemDto[]> {
  const versionIds = documents
    .map((doc) => doc.currentVersion?.id)
    .filter((id): id is string => Boolean(id));

  const scanMap = await loadWorkspaceVersionScanPublicDtoMap({
    tenantId,
    versionIds,
  });

  return documents.map((doc) => {
    if (!doc.currentVersion) return doc;
    const scan = scanMap.get(doc.currentVersion.id);
    if (!scan) return doc;
    return {
      ...doc,
      currentVersion: {
        ...doc.currentVersion,
        scan,
      },
    };
  });
}
