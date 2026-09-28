import Link from "next/link";
import { FileStack } from "lucide-react";
import { notFound } from "next/navigation";
import PlatformTemplatesWorkspace from "@/components/admin/communication/templates/PlatformTemplatesWorkspace";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { EmptyState, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS } from "@/lib/communication/templates/route-access";
import { listPlatformCommunicationTemplates } from "@/lib/communication/templates/platform-template-service";
import { resolvePlatformTemplateAuthorization } from "@/lib/communication/templates/platform-template-authorization";

export const dynamic = "force-dynamic";

export default async function CommunicationTemplatesPage() {
  const session = await requireAnyPermission(PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const authz = await resolvePlatformTemplateAuthorization({
    tenantId: tenant.id,
    tenantKey: tenant.key,
    userId: session.user.id,
  });

  const templates = await listPlatformCommunicationTemplates({ tenantId: tenant.id });

  const primaryAction = authz.canManage ? (
    <Link
      href="/dashboard/communication/vorlagen/new"
      className="inline-flex rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2"
    >
      Neue Vorlage
    </Link>
  ) : undefined;

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Vorlagen" },
        ]}
        title="Vorlagen"
        description="Wiederverwendbare Inhalte für Kampagnen und Vereinsmitteilungen. Vorlagen erstellen normale Entwürfe — keine parallele Kommunikationsdomäne."
        primaryAction={templates.length > 0 ? primaryAction : undefined}
      />

      {templates.length === 0 ? (
        <CommunicationContentSurface>
          <EmptyState
            icon={<FileStack className="h-8 w-8" aria-hidden />}
            heading="Noch keine Vorlagen"
            description="Legen Sie wiederverwendbare Inhalte für Mitteilungen und Kampagnen an."
            action={primaryAction}
          />
        </CommunicationContentSurface>
      ) : (
        <CommunicationContentSurface padded={false} className="overflow-hidden">
          <PlatformTemplatesWorkspace initialTemplates={templates} canManage={authz.canManage} />
        </CommunicationContentSurface>
      )}
    </PageShell>
  );
}
