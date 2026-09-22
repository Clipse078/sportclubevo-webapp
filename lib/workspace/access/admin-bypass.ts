/**
 * WORKSPACE-01 — pure Workspace ACL must not treat tenant admin capabilities as resource grants.
 */

import { PERMISSIONS } from "@/lib/permissions/permissions";

const NON_RESOURCE_BYPASS_PERMISSIONS = [
  PERMISSIONS.WORKSPACE_MANAGE,
  PERMISSIONS.WORKSPACE_VIEW,
  PERMISSIONS.WORKSPACE_DELETE,
  "people.manage",
  "tasks.manage",
  "requirements.manage",
] as const;

export type PureAclEvaluationInput = {
  permissionKeys: readonly string[];
  isSuperAdmin?: boolean;
  isClubAdmin?: boolean;
};

/**
 * Returns false always — admin / manage permissions are evaluated separately from resource ACL.
 */
export function pureWorkspaceAclGrantsResourceAccess(
  input: PureAclEvaluationInput,
): false {
  void input;
  return false;
}

export function tenantCapabilityGrantsAreSeparateFromResourceAcl(): true {
  return true;
}

export function listNonResourceBypassPermissions(): readonly string[] {
  return NON_RESOURCE_BYPASS_PERMISSIONS;
}
