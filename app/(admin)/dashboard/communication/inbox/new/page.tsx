import Link from "next/link";
import DirectMessageComposer from "@/components/admin/communication/direct/DirectMessageComposer";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS } from "@/lib/communication/direct/route-access";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewDirectMessagePage() {
  await requireAnyPermission(DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation", href: "/dashboard/communication" },
          { label: "Kommunikationscenter", href: "/dashboard/communication/inbox" },
          { label: "Neue Nachricht" },
        ]}
        title="Neue Nachricht"
        description="Direkte Nachricht an eine oder mehrere Personen im Verein."
        secondaryActions={
          <Link
            href="/dashboard/communication/inbox"
            className="inline-flex items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold"
          >
            Abbrechen
          </Link>
        }
      />
      <CommunicationContentSurface>
        <DirectMessageComposer tenantId={tenant.id} />
      </CommunicationContentSurface>
    </PageShell>
  );
}
