import { PageShell } from "@/components/ui/page";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import { AdminHubView } from "@/components/admin/admin-hub/AdminHubView";
import { requireTenantAdministration } from "@/lib/permissions/require-tenant-administration";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import { buildAdminHubGroupsForUser } from "@/lib/nav/admin-hub-catalog";
import type { PermissionKey } from "@/lib/permissions/permissions";

export const dynamic = "force-dynamic";

export default async function AdminHubPage() {
  const session = await requireTenantAdministration();
  const tenantId = session.user.activeTenantId ?? undefined;
  const { platform, tenant } = await getRequestEffectivePermissions(session.user.id, tenantId);
  const permissionKeys = [...new Set([...platform, ...tenant])] as PermissionKey[];
  const groups = buildAdminHubGroupsForUser(permissionKeys);

  return (
    <PageShell>
      <AdminSectionHeader
        eyebrow="Admin"
        title="Admin"
        description="Vereinsweite Einstellungen, Zugriffe und Administration."
      />
      <AdminHubView groups={groups} />
    </PageShell>
  );
}
