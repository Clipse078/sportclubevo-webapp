import { PageShell } from "@/components/ui/page";
import { SceActionLink } from "@/components/sce/actions/SceActionLink";
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
            <SceActionLink
              href="/dashboard/communication/mitteilungen/new"
              variant="primary"
              data-sce-action-hierarchy="PRIMARY"
            >
              Neue Mitteilung
            </SceActionLink>
          ) : undefined
        }
        secondaryActions={
          access.kampagnenSend ? (
            <SceActionLink
              href="/dashboard/communication/kampagnen/new"
              variant="secondary"
              data-sce-action-hierarchy="SECONDARY"
            >
              Neue Kampagne
            </SceActionLink>
          ) : undefined
        }
      />

      <CommunicationHubView access={access} />
    </PageShell>
  );
}
