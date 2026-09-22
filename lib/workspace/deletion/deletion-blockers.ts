import type { Prisma } from "@prisma/client";

export type WorkspaceDeletionBlockerKind =
  | "TASK_DOCUMENT_REFERENCE"
  | "WORKSPACE_DOCUMENT_VERSION_REFERENCE";

export type WorkspaceDeletionBlocker = {
  kind: WorkspaceDeletionBlockerKind;
  referenceId: string;
  message: string;
};

export const WORKSPACE_DELETION_BLOCKED_CODE = "RESOURCE_REFERENCED" as const;

type DeletionClient = Pick<
  Prisma.TransactionClient,
  "taskDocumentReference" | "workspaceDocument"
>;

/**
 * Central registry for durable references that must block destructive
 * permanent deletion of workspace documents (W07 extends here).
 */
export async function getWorkspaceDocumentDeletionBlockers(
  client: DeletionClient,
  tenantId: string,
  documentId: string,
): Promise<WorkspaceDeletionBlocker[]> {
  const blockers: WorkspaceDeletionBlocker[] = [];

  const taskRefs = await client.taskDocumentReference.findMany({
    where: { tenantId, documentId },
    select: { id: true },
  });

  for (const ref of taskRefs) {
    blockers.push({
      kind: "TASK_DOCUMENT_REFERENCE",
      referenceId: ref.id,
      message:
        "Das Dokument wird von mindestens einer Aufgabe referenziert.",
    });
  }

  return blockers;
}

export async function canPermanentlyDeleteWorkspaceDocument(
  client: DeletionClient,
  tenantId: string,
  documentId: string,
): Promise<{ allowed: true } | { allowed: false; blockers: WorkspaceDeletionBlocker[] }> {
  const blockers = await getWorkspaceDocumentDeletionBlockers(
    client,
    tenantId,
    documentId,
  );
  if (blockers.length > 0) {
    return { allowed: false, blockers };
  }
  return { allowed: true };
}
