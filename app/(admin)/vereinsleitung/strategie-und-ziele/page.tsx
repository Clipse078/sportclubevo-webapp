import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { loadClubStrategyAuthoring } from "@/lib/club-development/club-strategy-service";
import { getMeetingDecisionLinkOptions, getMeetingLinkOptions } from "@/lib/linking/queries";
import { loadStrategyOverview } from "@/lib/club-development/strategy-overview";
import { CD_NAV_WORKSPACE_LABELS } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import StrategieUndZieleWorkspaceClient from "@/components/admin/club-development/StrategieUndZieleWorkspaceClient";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function StrategieUndZielePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  const [authoring, { targets }, availableMeetings, availableDecisions] = await Promise.all([
    loadClubStrategyAuthoring(actor, actorUserId),
    loadStrategyOverview(actor),
    getMeetingLinkOptions(actor),
    getMeetingDecisionLinkOptions(actor),
  ]);

  const canManageTargets = actor.permissionKeys.includes(PERMISSIONS.TARGETS_MANAGE);
  const focusTargetIds = authoring?.focusTargets.map((row) => row.target.id) ?? [];

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vereinsentwicklung"
        title={CD_NAV_WORKSPACE_LABELS.strategieUndZiele}
        description="Clubstrategie, Schwerpunkte und Fortschritt zu Zielen — lokale Ansichten Strategie und Alle Ziele."
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung/club-entwicklung" },
          { label: CD_NAV_WORKSPACE_LABELS.strategieUndZiele },
        ]}
        isEmpty={false}
      >
        <StrategieUndZieleWorkspaceClient
          authoring={authoring}
          canManageTargets={canManageTargets}
          targets={targets}
          focusTargetIds={focusTargetIds}
          availableMeetings={availableMeetings}
          availableDecisions={availableDecisions}
        />
      </ListPagePattern>
    </PageShell>
  );
}