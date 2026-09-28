import Link from "next/link";
import { PageShell } from "@/components/ui/page";
import { CommunicationHubView } from "@/components/admin/communication/hub/CommunicationHubView";
import { CommunicationWorkspaceHeader } from "@/components/admin/communication/shared/CommunicationWorkspaceHeader";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import {
  COMMUNICATION_HUB_ROUTE_PERMISSIONS,
  resolveCommunicationHubCapabilityAccess,
} from "@/lib/communication/hub-access";

export const dynamic = "force-dynamic";

export default async function CommunicationPage() {
  const session = await requireAnyPermission(COMMUNICATION_HUB_ROUTE_PERMISSIONS);
  const effectiveTenantId = session.user.activeTenantId ?? undefined;
  const { tenant: tenantPermissions } = await getRequestEffectivePermissions(
    session.user.id,
    effectiveTenantId,
  );
  const access = resolveCommunicationHubCapabilityAccess(tenantPermissions);

  return (
    <PageShell>
      <CommunicationWorkspaceHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation" },
        ]}
        title="Kommunikation"
        description="Kommunikation mit Mitgliedern, Teams und Partnern zentral steuern."
        primaryAction={
          access.mitteilungenSend ? (
            <Link
              href="/dashboard/communication/mitteilungen/new"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--sce-primary)] px-4 py-2.5 text-sm font-semibold text-white no-underline motion-safe:transition-opacity motion-safe:duration-150 motion-safe:hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Neue Mitteilung
            </Link>
          ) : undefined
        }
        secondaryActions={
          access.kampagnenSend ? (
            <Link
              href="/dashboard/communication/kampagnen/new"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--sce-surface-standard)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] no-underline motion-safe:transition-colors motion-safe:duration-150 motion-safe:hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Neue Kampagne
            </Link>
          ) : undefined
        }
      />

      <CommunicationHubView access={access} />
    </PageShell>
  );
}
