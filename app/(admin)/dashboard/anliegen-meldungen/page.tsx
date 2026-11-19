import { redirect } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { DEFAULT_TENANT_KEY } from "@/lib/tenants/queries";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { hasMeldungPermission } from "@/lib/club-meldungen/access";

export default async function DashboardAnliegenMeldungenPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.MELDUNGEN_HANDLE,
    PERMISSIONS.MELDUNGEN_VIEW_ALL,
    PERMISSIONS.MELDUNGEN_SUBMIT,
  ]);
  const ctx = await getActiveTenant();
  const tenantKey = ctx?.key ?? DEFAULT_TENANT_KEY;
  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  const tenantId = ctx?.id;
  let internalWorkspace = false;
  if (tenantId) {
    const resolver = createEffectivePermissionResolver(prisma);
    const effective = await resolver.getEffectivePermissions({
      userId: actorUserId,
      tenantId,
    });
    const permissionKeys = [...effective.platform, ...effective.tenant];
    internalWorkspace =
      hasMeldungPermission(permissionKeys, PERMISSIONS.MELDUNGEN_HANDLE) ||
      hasMeldungPermission(permissionKeys, PERMISSIONS.MELDUNGEN_VIEW_ALL);
  }
  redirect(
    internalWorkspace
      ? `/tenant/${tenantKey}/cockpit/meldungen`
      : `/tenant/${tenantKey}/anliegen`,
  );
}