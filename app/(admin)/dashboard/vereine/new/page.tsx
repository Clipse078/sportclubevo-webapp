import Link from "next/link";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import ClubForm from "@/components/admin/club-directory/ClubForm";
import { PageBreadcrumbs, PageHeader } from "@/components/ui/page";

export default async function NewClubPage() {
  await requireAnyPermission([PERMISSIONS.ORG_MANAGE]);

  return (
    <div className="mx-auto max-w-6xl space-y-8" data-testid="vereine-new-fallback">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <PageBreadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Vereine", href: "/dashboard/vereine" },
              { label: "Neuer Verein" },
            ]}
          />
          <PageHeader
            title="Neuer Verein"
            description="Deep-Link / Fallback — dieselbe Formularlogik wie im Workspace-Composer."
          />
        </div>
        <Link href="/dashboard/vereine" className="fca-button-secondary shrink-0 self-start">
          Zurück zur Übersicht
        </Link>
      </div>

      <ClubForm mode="create" layout="composer" />
    </div>
  );
}
