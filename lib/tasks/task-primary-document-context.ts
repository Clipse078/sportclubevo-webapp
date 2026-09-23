import { TaskContextType } from "@prisma/client";

/**
 * AUFGABEN-06D primary DOCUMENT context is navigation/listing semantics only —
 * not an immutable WorkspaceDocumentVersion business reference (WORKSPACE-07).
 */
export function isPrimaryDocumentContextForImmutableEvidence(task: {
  contextType: TaskContextType | null;
  contextId: string | null;
}): boolean {
  return false;
}

export function isTaskPrimaryDocumentContext(task: {
  contextType: TaskContextType | null;
  contextId: string | null;
}): boolean {
  return task.contextType === TaskContextType.DOCUMENT && Boolean(task.contextId?.trim());
}
