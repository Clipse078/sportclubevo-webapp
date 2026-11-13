import { GoalSceIcon } from "@/components/icons/domain-sce-icon-components";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { loadStrategyOverview } from "@/lib/club-development/strategy-overview";
import StrategyOverviewPanel from "@/components/admin/club-development/StrategyOverviewPanel";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export default async function VereinsleitungStrategiePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const { targets } = await loadStrategyOverview(actor);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Strategie"
        title="Strategische Übersicht"
        description="Ziele mit Outcome-Fortschritt, Umsetzungsfortschritt über verknüpfte Initiativen und Kennzahlen."
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung" },
          { label: "Strategie" },
        ]}
        isEmpty={targets.length === 0}
        emptyIcon={<GoalSceIcon className="h-10 w-10" />}
        emptyHeading="Keine strategischen Ziele"
        emptyDescription="Noch keine sichtbaren Ziele oder fehlende Berechtigungen."
      >
        <StrategyOverviewPanel targets={targets} />
      </ListPagePattern>
    </PageShell>
  );
}
