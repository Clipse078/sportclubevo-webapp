/**
 * WORKSPACE-08-01 — explicit system/background actor (no fake User row).
 */

export const WORKSPACE_SYSTEM_AUDIT_SOURCE = "system" as const;

export type WorkspaceSystemActorMetadata = {
  source: typeof WORKSPACE_SYSTEM_AUDIT_SOURCE;
  jobType?: string;
  correlationId?: string;
};

export function buildWorkspaceSystemActorMetadata(
  input?: Omit<WorkspaceSystemActorMetadata, "source">,
): WorkspaceSystemActorMetadata {
  return {
    source: WORKSPACE_SYSTEM_AUDIT_SOURCE,
    ...input,
  };
}
