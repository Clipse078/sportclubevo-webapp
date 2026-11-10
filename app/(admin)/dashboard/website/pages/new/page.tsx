import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import WebsitePageForm from "@/components/admin/pages/WebsitePageForm";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

export default async function WebsitePageNewPage() {
  await requireAnyPermission([PERMISSIONS.WEBSITE_MANAGE]);

  const ctx = await getActiveTenant();
  if (!ctx) notFound();

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Website"
        title="Neue Seite"
        description="Erstelle eine neue Website-Seite. Sie wird als Entwurf gespeichert bis du sie veröffentlichst."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Seiten", href: "/dashboard/website/pages" },
          { label: "Neu" },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
      >
        <WebsitePageForm requiresReview={ctx.approvedDataOnly} />
      </FormPagePattern>
    </PageShell>
  );
}
