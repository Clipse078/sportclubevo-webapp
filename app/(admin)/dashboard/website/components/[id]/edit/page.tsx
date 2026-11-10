import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getReusableComponent } from "@/lib/reusable-components/queries";
import ReusableComponentEditor from "@/components/admin/reusable-components/ReusableComponentEditor";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";
import { WebsiteWorkspaceTabs } from "@/components/admin/cms/WebsiteWorkspaceTabs";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditReusableComponentPage({ params }: PageProps) {
  const session = await requireAnyPermission([PERMISSIONS.WEBSITE_MANAGE]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const { id } = await params;
  const component = await getReusableComponent(tenantId, id);
  if (!component) notFound();

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Website"
        title={component.title}
        description="Wiederverwendbaren Inhalt bearbeiten."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Website", href: "/dashboard/website" },
          { label: "Komponenten", href: "/dashboard/website/components" },
          { label: component.title },
        ]}
        contextTabs={<WebsiteWorkspaceTabs />}
      >
        <ReusableComponentEditor mode="edit" initialData={component} />
      </FormPagePattern>
    </PageShell>
  );
}
