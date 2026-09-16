import { notFound } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { createClubDirectoryQueryDatabase } from "@/lib/club-directory/prisma-adapter";
import { getExternalClubById } from "@/lib/club-directory/query-service";
import MergeClubForm from "@/components/admin/club-directory/MergeClubForm";
import { PageShell, PageBreadcrumbs, PageHeader } from "@/components/ui/page";

type Props = { params: Promise<{ clubId: string }> };

export default async function MergeClubPage({ params }: Props) {
  await requireAnyPermission([PERMISSIONS.ORG_MANAGE]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const { clubId } = await params;
  const club = await getExternalClubById(createClubDirectoryQueryDatabase(prisma), {
    tenantId: tenant.id,
    id: clubId,
  });
  if (!club) notFound();

  return (
    <PageShell fullWidth>
      <div className="flex flex-col gap-6" data-testid="club-merge-page">
        <PageBreadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Vereine", href: "/dashboard/vereine" },
            { label: club.name, href: `/dashboard/vereine/${club.id}` },
            { label: "Duplikate zusammenführen" },
          ]}
        />
        <PageHeader
          eyebrow="Organisation · Vereine"
          title="Duplikate zusammenführen"
          description={`Führe fälschlich als eigene Vereine angelegte Team-Duplikate mit ${club.name} zusammen.`}
          className="mb-0"
        />
        <MergeClubForm
          survivingClub={{
            id: club.id,
            name: club.name,
            shortName: club.shortName,
            logoUrl: club.logoUrl,
            teamCount: club.teamCount,
            hasProviderMapping: club.hasProviderMapping,
          }}
        />
      </div>
    </PageShell>
  );
}
