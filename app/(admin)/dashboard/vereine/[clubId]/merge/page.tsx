import { notFound } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { createClubDirectoryQueryDatabase } from "@/lib/club-directory/prisma-adapter";
import { getExternalClubById } from "@/lib/club-directory/query-service";
import MergeClubForm from "@/components/admin/club-directory/MergeClubForm";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

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
      <FormPagePattern
        eyebrow="Organisation · Vereine"
        title="Duplikate zusammenführen"
        description={`Führe fälschlich als eigene Vereine angelegte Team-Duplikate mit ${club.name} zusammen.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Vereine", href: "/dashboard/vereine" },
          { label: club.name, href: `/dashboard/vereine/${club.id}` },
          { label: "Duplikate zusammenführen" },
        ]}
      >
        <div data-testid="club-merge-page">
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
      </FormPagePattern>
    </PageShell>
  );
}
