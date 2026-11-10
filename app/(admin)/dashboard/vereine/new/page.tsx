import Link from "next/link";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import ClubForm from "@/components/admin/club-directory/ClubForm";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";

export default async function NewClubPage() {
  await requireAnyPermission([PERMISSIONS.ORG_MANAGE]);

  return (
    <PageShell fullWidth>
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Vereine", href: "/dashboard/vereine" },
          { label: "Neuer Verein" },
        ]}
        header={{
          eyebrow: "Organisation",
          title: "Neuer Verein",
          description:
            "Deep-Link / Fallback — dieselbe Formularlogik wie im Workspace-Composer.",
          secondaryActions: (
            <Link href="/dashboard/vereine" className="fca-button-secondary shrink-0">
              Zurück zur Übersicht
            </Link>
          ),
        }}
      >
        <div data-testid="vereine-new-fallback">
          <ClubForm mode="create" layout="composer" />
        </div>
      </SceWorkspaceChrome>
    </PageShell>
  );
}
