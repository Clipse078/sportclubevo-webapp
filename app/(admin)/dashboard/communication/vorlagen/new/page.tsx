import { notFound, redirect } from "next/navigation";
import PlatformTemplateEditor from "@/components/admin/communication/templates/PlatformTemplateEditor";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requirePlatformTemplateManage } from "@/lib/communication/templates/platform-template-authorization";

export const dynamic = "force-dynamic";

export default async function NewPlatformTemplatePage() {
  const session = await requireAnyPermission([PERMISSIONS.COMMUNICATION_TEMPLATES_MANAGE]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  try {
    await requirePlatformTemplateManage({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
  } catch {
    redirect("/dashboard/communication/vorlagen");
  }

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Vorlagen", href: "/dashboard/communication/vorlagen" },
          { label: "Neu" },
        ]}
      />
      <PageHeader eyebrow="Kommunikation" title="Neue Vorlage" description="Inhalte und optionale Zielgruppen-Defaults speichern." />
      <PlatformTemplateEditor />
    </PageShell>
  );
}
