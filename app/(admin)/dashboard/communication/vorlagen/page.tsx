import Link from "next/link";
import { notFound } from "next/navigation";
import PlatformTemplatesWorkspace from "@/components/admin/communication/templates/PlatformTemplatesWorkspace";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listPlatformCommunicationTemplates } from "@/lib/communication/templates/platform-template-service";
import { resolvePlatformTemplateAuthorization } from "@/lib/communication/templates/platform-template-authorization";

export const dynamic = "force-dynamic";

export default async function CommunicationTemplatesPage() {
  const session = await requireAnyPermission([
    PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW,
    PERMISSIONS.COMMUNICATION_TEMPLATES_MANAGE,
  ]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const authz = await resolvePlatformTemplateAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const templates = await listPlatformCommunicationTemplates({ tenantId: tenant.id });

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Vorlagen" },
        ]}
      />
      <PageHeader
        eyebrow="Kommunikation"
        title="Vorlagen"
        description="Wiederverwendbare Inhalte für Kampagnen und Vereinsmitteilungen. Vorlagen erstellen normale Entwürfe — keine parallele Kommunikationsdomäne."
      />
      {authz.canManage ? (
        <div className="mb-4 flex justify-end">
          <Link
            href="/dashboard/communication/vorlagen/new"
            className="inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Neue Vorlage
          </Link>
        </div>
      ) : null}
      <PlatformTemplatesWorkspace initialTemplates={templates} canManage={authz.canManage} />
    </PageShell>
  );
}
