import Link from "next/link";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import NextSeasonPlannerCard from "@/components/admin/seasons/NextSeasonPlannerCard";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
export default async function NextSeasonPlannerPage() {
  await requirePermission(PERMISSIONS.SEASONS_MANAGE);

  return (
    <PageShell widthMode="operational">
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Saisons", href: "/dashboard/seasons" },
          { label: "Next Season Planner" },
        ]}
        header={{
          eyebrow: "Saisons",
          title: "Next Season Planner",
          description:
            "Erstelle zuerst die nächste künftige Saison. Danach können Teams, Sponsoren und Events sauber saisonspezifisch für diese Zukunftssaison geplant werden.",
          secondaryActions: (
            <Link href="/dashboard/seasons" className="fca-button-secondary">
              Zurück zu Saisons
            </Link>
          ),
        }}
      >
        <NextSeasonPlannerCard />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
