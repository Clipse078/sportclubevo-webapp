/**
 * /dashboard/teams/provider-mapping
 *
 * Admin overview for canonical provider team mappings.
 *
 * Shows all TeamExternalMapping rows for the active tenant with their
 * competition context, confidence level, and mapping status.
 *
 * TEAM-PROVIDER-01: Provider-neutral. SFV is the first adapter.
 * German UI. Server Component with client-side interactions.
 */

import { Link2, Plus } from "lucide-react";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { listProviderMappings } from "@/lib/provider-mapping/provider-mapping-queries";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import ProviderMappingWorkspace from "@/components/admin/teams/provider-mapping/ProviderMappingWorkspace";
import { SceActionLink } from "@/components/sce/actions/SceActionLink";
import { SceEmptyState } from "@/components/sce/feedback/SceEmptyState";
import type { MappingFilterParams } from "@/lib/provider-mapping/provider-mapping-queries";

type PageProps = {
  searchParams?: Promise<{
    provider?: string;
    search?: string;
    mappingSource?: string;
    seasonId?: string;
  }>;
};

export default async function ProviderMappingPage({ searchParams }: PageProps) {
  const session = await requireAnyPermission([
    PERMISSIONS.TEAMS_VIEW,
    PERMISSIONS.TEAMS_MANAGE,
  ]);

  const tenant = await getActiveTenant();
  const tenantId = tenant?.id;

  if (!tenantId) {
    return (
      <PageShell fullWidth>
        <div className="text-red-600 text-sm">Kein Mandanten-Kontext verfügbar.</div>
      </PageShell>
    );
  }

  const params = (await searchParams) ?? {};
  const filters: MappingFilterParams = {
    provider: params.provider ?? undefined,
    search: params.search ?? undefined,
    mappingSource: (params.mappingSource as MappingFilterParams["mappingSource"]) ?? undefined,
    seasonId: params.seasonId ?? undefined,
  };

  const mappings = await listProviderMappings(tenantId, filters);

  const canManage = session.user.permissionKeys?.includes(PERMISSIONS.TEAMS_MANAGE);

  const mappedCount = mappings.filter((m) => m.teamSeasonId !== null).length;
  const unmappedCount = mappings.filter((m) => m.teamSeasonId === null).length;

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Teams · Anbieter-Mapping"
        title="Anbieter-Zuordnungen"
        description="Ordnen Sie TeamSeason-Einträge externen Anbieter-Teams zu. Der Wettbewerb dient als Kontext — er besitzt die Zuordnung nicht."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Teams", href: "/dashboard/teams" },
          { label: "Anbieter-Zuordnungen", href: "/dashboard/teams/provider-mapping" },
        ]}
        headerActions={
          canManage ? (
            <SceActionLink
              href="/dashboard/teams/provider-mapping/new"
              data-sce-action-hierarchy="PRIMARY"
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Neue Zuordnung
            </SceActionLink>
          ) : undefined
        }
        isEmpty={mappings.length === 0}
        emptyState={
          <SceEmptyState
            variant="NO_DATA"
            icon={<Link2 className="h-10 w-10" />}
            title="Noch keine Anbieter-Zuordnungen"
            description='Erstellen Sie die erste Zuordnung über „Neue Zuordnung".'
            primaryAction={
              canManage ? (
                <SceActionLink href="/dashboard/teams/provider-mapping/new">Neue Zuordnung</SceActionLink>
              ) : undefined
            }
            contained
          />
        }
      >
        {mappings.length > 0 ? (
          <ProviderMappingWorkspace
            mappings={mappings}
            canManage={canManage ?? false}
            mappedCount={mappedCount}
            unmappedCount={unmappedCount}
            currentProvider={params.provider}
            currentSearch={params.search}
            currentMappingSource={params.mappingSource}
          />
        ) : null}
      </ListPagePattern>
    </PageShell>
  );
}
