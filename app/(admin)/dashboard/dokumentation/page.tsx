import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { ensureDefaultSpace } from "@/lib/tenant-documentation/page-tree-service";

export default async function TenantDocumentationHubPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
    PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
    PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
    PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
  ]);

  const tenant = await getActiveTenant();
  if (!tenant) redirect("/dashboard");

  const actorUserId = session.user?.id ?? null;

  await ensureDefaultSpace(tenant.id, actorUserId);

  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { tenantId: tenant.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (!page) redirect("/dashboard");
  redirect(`/dashboard/dokumentation/p/${page.id}`);
}