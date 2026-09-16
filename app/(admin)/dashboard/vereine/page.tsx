import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import ClubDirectorySearchableList from "@/components/admin/club-directory/ClubDirectorySearchableList";
import { ListPagePattern } from "@/components/ui/patterns";
import { PageShell } from "@/components/ui/page";
import {
  parseClubDirectoryProviderFilter,
  parseClubDirectoryTeamsFilter,
} from "@/lib/club-directory/directory-view-filters";

type PageProps = {
  searchParams: Promise<{ view?: string; provider?: string; teams?: string; q?: string }>;
};

export default async function VereinePage({ searchParams }: PageProps) {
  await requireAnyPermission([PERMISSIONS.ORG_VIEW, PERMISSIONS.ORG_MANAGE]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const { view, provider, teams, q } = await searchParams;
  const showArchived = view === "archived";
  const providerFilter = parseClubDirectoryProviderFilter(provider);
  const teamsFilter = parseClubDirectoryTeamsFilter(teams);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Organisation"
        title="Vereine"
        description="Kanonisches Verzeichnis externer Vereine und ihrer Teams — dieselbe Datenquelle wie TournamentCenter, MatchCenter und Infoboard."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Vereine" }]}
        headerActions={
          <Link href="/dashboard/vereine/new" className="fca-button-primary">
            <Plus className="h-4 w-4" />
            Neuer Verein
          </Link>
        }
      >
        <ClubDirectorySearchableList
          showArchived={showArchived}
          providerFilter={providerFilter}
          teamsFilter={teamsFilter}
          initialQuery={q ?? ""}
        />
      </ListPagePattern>
    </PageShell>
  );
}
