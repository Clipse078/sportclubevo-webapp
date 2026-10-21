/**
 * /dashboard/competitions
 *
 * Admin overview of canonical Competition records.
 * Shows all competitions for the active tenant, with search, provider filter,
 * and archived toggle. Provides SFV sync trigger and manual creation for all
 * tenants — no provider required.
 *
 * German UI. Responsive. Server Component with client-side interactions.
 */

import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { listCompetitions } from "@/lib/competitions/queries";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import CompetitionsListWorkspace from "@/components/admin/competitions/CompetitionsListWorkspace";
import type { CompetitionFilterParams } from "@/lib/competitions/dto";

type CompetitionsPageProps = {
  searchParams?: Promise<{
    search?: string;
    provider?: string;
    externalSeasonId?: string;
    includeArchived?: string;
    competitionType?: string;
    gender?: string;
  }>;
};

export default async function CompetitionsPage({ searchParams }: CompetitionsPageProps) {
  const session = await requireAnyPermission([
    PERMISSIONS.COMPETITIONS_VIEW,
    PERMISSIONS.COMPETITIONS_MANAGE,
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

  const filters: CompetitionFilterParams = {
    search: params.search,
    provider: params.provider,
    externalSeasonId: params.externalSeasonId
      ? parseInt(params.externalSeasonId, 10)
      : undefined,
    includeArchived: params.includeArchived === "true",
    competitionType: params.competitionType as CompetitionFilterParams["competitionType"],
    gender: params.gender as CompetitionFilterParams["gender"],
  };

  const competitions = await listCompetitions(tenantId, filters);

  const canManage = session.user.permissionKeys?.includes(PERMISSIONS.COMPETITIONS_MANAGE);

  const resolver = createEffectivePermissionResolver(prisma);
  const canDelete = await resolver.hasTenantDeletionAuthority({
    userId: session.user.id,
    permission: PERMISSIONS.COMPETITIONS_DELETE,
    tenantId,
  });

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Wettkämpfe"
        title="Wettkämpfe"
        description="Ligen, Cups und Turnierserien — Wettkampfmetadaten für alle Saisons. Wird aus dem SFV-Provider synchronisiert oder manuell erfasst."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Wettkämpfe" },
        ]}
      >
        <CompetitionsListWorkspace
          competitions={competitions}
          canManage={canManage}
          canDelete={canDelete}
          initialSearch={params.search ?? ""}
          initialProvider={params.provider ?? ""}
          initialIncludeArchived={params.includeArchived === "true"}
          hasSearchFilter={Boolean(filters.search)}
        />
      </ListPagePattern>
    </PageShell>
  );
}
