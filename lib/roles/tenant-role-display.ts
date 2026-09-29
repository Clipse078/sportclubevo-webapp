/** Display label for tenant roles in selectors and saved-audience chips. */
export function formatTenantRoleDisplayLabel(name: string, isArchived: boolean): string {
  return isArchived ? `${name} (Archiviert)` : name;
}

/** Prisma `where` fragment for tenant roles eligible in new selector discovery. */
export function tenantRoleSelectorDiscoveryWhere(tenantId: string) {
  return {
    tenantId,
    scope: "TENANT" as const,
    isArchived: false,
  };
}
