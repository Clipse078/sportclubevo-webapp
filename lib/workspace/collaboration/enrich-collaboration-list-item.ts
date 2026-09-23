import { prisma } from "@/lib/db/prisma";

export type CollaborationResourceDisplay = {
  name: string;
  parentFolderName: string | null;
};

export async function loadCollaborationResourceDisplay(input: {
  tenantId: string;
  resourceType: "FOLDER" | "DOCUMENT";
  resourceId: string;
}): Promise<CollaborationResourceDisplay | null> {
  if (input.resourceType === "FOLDER") {
    const folder = await prisma.workspaceFolder.findFirst({
      where: { id: input.resourceId, tenantId: input.tenantId },
      select: { name: true },
    });
    if (!folder) return null;
    return { name: folder.name, parentFolderName: null };
  }

  const document = await prisma.workspaceDocument.findFirst({
    where: { id: input.resourceId, tenantId: input.tenantId },
    select: {
      name: true,
      folder: { select: { name: true } },
    },
  });
  if (!document) return null;
  return {
    name: document.name,
    parentFolderName: document.folder?.name ?? null,
  };
}
