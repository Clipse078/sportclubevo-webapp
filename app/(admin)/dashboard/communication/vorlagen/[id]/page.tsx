import { notFound } from "next/navigation";
import PlatformTemplateEditor from "@/components/admin/communication/templates/PlatformTemplateEditor";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PLATFORM_TEMPLATE_MANAGE_ROUTE_PERMISSIONS } from "@/lib/communication/templates/route-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { getPlatformCommunicationTemplate } from "@/lib/communication/templates/platform-template-service";
import { requirePlatformTemplateManage } from "@/lib/communication/templates/platform-template-authorization";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPlatformTemplatePage({ params }: PageProps) {
  const session = await requireAnyPermission(PLATFORM_TEMPLATE_MANAGE_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const { id } = await params;

  try {
    await requirePlatformTemplateManage({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
  } catch {
    notFound();
  }

  const template = await getPlatformCommunicationTemplate({
    tenantId: tenant.id,
    templateId: id,
  });

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Vorlagen", href: "/dashboard/communication/vorlagen" },
          { label: template.name },
        ]}
      />
      <PageHeader eyebrow="Kommunikation" title={template.name} description="Vorlage bearbeiten" />
      <PlatformTemplateEditor
        templateId={template.id}
        initial={{
          name: template.name,
          description: template.description ?? "",
          kind: template.kind,
          status: template.status,
          internalName: template.internalName ?? "",
          subject: template.subject ?? "",
          bodyText: template.bodyText,
        }}
      />
    </PageShell>
  );
}
