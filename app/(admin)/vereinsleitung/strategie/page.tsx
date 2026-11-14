import Link from "next/link";
import { GoalSceIcon } from "@/components/icons/domain-sce-icon-components";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { loadStrategyOverview } from "@/lib/club-development/strategy-overview";
import StrategyOverviewPanel from "@/components/admin/club-development/StrategyOverviewPanel";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function VereinsleitungStrategiePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const { targets } = await loadStrategyOverview(actor);
  const canManageTargets = actor.permissionKeys.includes(PERMISSIONS.TARGETS_MANAGE);
  const canViewTargets =
    canManageTargets || actor.permissionKeys.includes(PERMISSIONS.TARGETS_VIEW);

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
        emptyDescription={
          canManageTargets
            ? "Erfassen Sie das erste strategische Ziel (Objective)."
            : canViewTargets
              ? "Noch keine sichtbaren Ziele."
              : "Keine Berechtigung zum Anzeigen strategischer Ziele."
        }
        emptyAction={
          canManageTargets ? (
            <Link
              href="/vereinsleitung/targets/new"
              className="inline-flex items-center rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Strategisches Ziel erfassen
            </Link>
          ) : undefined
        }
      >
        <StrategyOverviewPanel targets={targets} canManageTargets={canManageTargets} />
      </ListPagePattern>
    </PageShell>
  );
}
