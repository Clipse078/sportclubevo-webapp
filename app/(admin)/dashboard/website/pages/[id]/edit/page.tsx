import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getWebsitePageAdminById } from "@/lib/pages/admin-queries";
import WebsitePageForm from "@/components/admin/pages/WebsitePageForm";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

export default async function WebsitePageEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAnyPermission([PERMISSIONS.WEBSITE_MANAGE]);

  const ctx = await getActiveTenant();
  if (!ctx) notFound();

  const { id } = await params;
  const page = await getWebsitePageAdminById(ctx.id, id);
  if (!page) notFound();

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Website"
        title={page.title}
        description={`Slug: ${page.slug}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Seiten", href: "/dashboard/website/pages" },
          { label: page.title },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
      >
        <WebsitePageForm page={page} requiresReview={ctx.approvedDataOnly} />
      </FormPagePattern>
    </PageShell>
  );
}
