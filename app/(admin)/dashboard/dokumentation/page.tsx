import { notFound, redirect } from "next/navigation";

import { TenantDocumentationUnauthorizedState } from "@/components/admin/tenant-documentation/TenantDocumentationUnauthorizedState";
import { PageShell } from "@/components/ui/page";
import { prisma } from "@/lib/db/prisma";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { TENANT_DOCUMENTATION_ACTIVE_PAGE_WHERE } from "@/lib/tenant-documentation/page-lifecycle";
import { ensureDefaultSpace } from "@/lib/tenant-documentation/page-tree-service";
import { resolveTenantDocumentationHubRouteAccess } from "@/lib/tenant-documentation/route-access";

export default async function TenantDocumentationHubPage() {
  const access = await resolveTenantDocumentationHubRouteAccess();

  if (access.kind === "unauthenticated") {
    redirect("/login");
  }

  if (access.kind === "forbidden" || access.kind === "no_tenant_context") {
    return (
      <PageShell>
        <TenantDocumentationUnauthorizedState reason={access.kind} />
      </PageShell>
    );
  }

  const tenant = await getActiveTenant();
  if (!tenant) {
    return (
      <PageShell>
        <TenantDocumentationUnauthorizedState reason="no_tenant_context" />
      </PageShell>
    );
  }

  await ensureDefaultSpace(tenant.id, access.actorUserId);

  const page = await prisma.tenantDocumentationPage.findFirst({
    where: { tenantId: tenant.id, ...TENANT_DOCUMENTATION_ACTIVE_PAGE_WHERE },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (!page) notFound();
  redirect(`/dashboard/dokumentation/p/${page.id}`);
}