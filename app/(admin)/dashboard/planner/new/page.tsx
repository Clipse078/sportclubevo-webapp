import PlannerEntryCreateForm from "@/components/admin/planner/PlannerEntryCreateForm";
import { getPlannerCreateFormData } from "@/lib/planner/queries";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";

type PlannerNewPageProps = {
  searchParams?: Promise<{
    season?: string;
    type?: string;
  }>;
};

export default async function PlannerNewPage({ searchParams }: PlannerNewPageProps) {
  const params = (await searchParams) ?? {};
  const data = await getPlannerCreateFormData({
    selectedSeasonKey: params.season,
    selectedType: params.type,
  });

  return (
    <PageShell widthMode="operational">
      <SceWorkspaceChrome
        breadcrumbs={[
          { label: "Planung", href: "/dashboard/planner/week" },
          { label: "Planner-Eintrag erstellen" },
        ]}
        header={{
          eyebrow: "Saisonplanner",
          title: "Neuen Planner-Eintrag erstellen",
          description:
            "Erstelle einen saisongebundenen Eintrag für Saisonagenda, Wochenplanner und Tagesplanner.",
        }}
      >
        <PlannerEntryCreateForm data={data} />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
