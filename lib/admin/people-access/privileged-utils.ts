export function userHasPrivilegedRole(
  roleIds: string[],
  privilegedRoleIds: readonly string[],
): boolean {
  const privileged = new Set(privilegedRoleIds);
  return roleIds.some((id) => privileged.has(id));
}
