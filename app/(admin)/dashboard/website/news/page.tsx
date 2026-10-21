import NewsArticleCreateTrigger from "@/components/admin/news/NewsArticleCreateTrigger";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { NEWS_READ_PERMISSIONS } from "@/lib/permissions/content-view-permissions";
import { sessionCanWriteNews } from "@/lib/permissions/content-view-access";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { requireActiveTenantId } from "@/lib/tenants/active-tenant";
import NewsArticleList from "@/components/admin/news/NewsArticleList";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export default async function NewsAdminPage() {
  const session = await requireAnyPermission([...NEWS_READ_PERMISSIONS]);
  const tenantId = await requireActiveTenantId();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { approvedDataOnly: true },
  });
  const readOnly = !sessionCanWriteNews(session);

  const resolver = createEffectivePermissionResolver(prisma);
  const canDelete = readOnly
    ? false
    : await resolver.hasTenantDeletionAuthority({
    userId: session.user.id,
    permission: PERMISSIONS.NEWS_DELETE,
    tenantId,
  });

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Website"
        title="News"
        description={
          readOnly
            ? "Veröffentlichte Newsartikel einsehen (read-only)."
            : "Newsartikel erstellen, prüfen, planen und veröffentlichen."
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website" },
          { label: "News" },
        ]}
        headerActions={
          readOnly ? undefined : (
            <NewsArticleCreateTrigger requiresReview={tenant?.approvedDataOnly ?? false} />
          )
        }
      >
        <NewsArticleList canDelete={canDelete} readOnly={readOnly} />
      </ListPagePattern>
    </PageShell>
  );
}
