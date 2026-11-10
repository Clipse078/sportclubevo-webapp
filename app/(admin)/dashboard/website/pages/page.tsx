import WebsitePageCreateTrigger from "@/components/admin/pages/WebsitePageCreateTrigger";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { requireActiveTenantId } from "@/lib/tenants/active-tenant";
import WebsitePageList from "@/components/admin/pages/WebsitePageList";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

export default async function WebsitePagesAdminPage() {
  const session = await requireAnyPermission([PERMISSIONS.WEBSITE_MANAGE]);
  const tenantId = await requireActiveTenantId();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { approvedDataOnly: true },
  });

  const resolver = createEffectivePermissionResolver(prisma);
  const canDelete = await resolver.hasTenantDeletionAuthority({
    userId: session.user.id,
    permission: PERMISSIONS.WEBSITE_DELETE,
    tenantId,
  });

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Website"
        title="Seiten"
        description="Statische Website-Seiten erstellen, bearbeiten und veröffentlichen. Veröffentlichte Seiten sind über die öffentliche API abrufbar."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Seiten" },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
        headerActions={
          <WebsitePageCreateTrigger requiresReview={tenant?.approvedDataOnly ?? false} />
        }
      >
        <WebsitePageList canDelete={canDelete} />
      </ListPagePattern>
    </PageShell>
  );
}
