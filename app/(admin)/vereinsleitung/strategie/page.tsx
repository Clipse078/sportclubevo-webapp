import Link from "next/link";
import { GoalSceIcon } from "@/components/icons/domain-sce-icon-components";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { loadClubStrategyAuthoring } from "@/lib/club-development/club-strategy-service";
import { getMeetingDecisionLinkOptions, getMeetingLinkOptions } from "@/lib/linking/queries";
import { loadStrategyOverview } from "@/lib/club-development/strategy-overview";
import { CD_STRATEGY_AUTHORING_COPY } from "@/lib/club-development/product-copy";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-presentation";
import StrategyAuthoringPanel from "@/components/admin/club-development/StrategyAuthoringPanel";
import StrategyOverviewPanel from "@/components/admin/club-development/StrategyOverviewPanel";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export default async function VereinsleitungStrategiePage() {
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
  const canViewTargets =
    canManageTargets || actor.permissionKeys.includes(PERMISSIONS.TARGETS_VIEW);
  const focusTargetIds = new Set(
    authoring?.focusTargets.map((row) => row.target.id) ?? [],
  );

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vereinsentwicklung"
        title={CD_STRATEGY_AUTHORING_COPY.pageTitle}
        description={CD_STRATEGY_AUTHORING_COPY.pageDescription}
        breadcrumbs={[
          { label: "Verein", href: "/vereinsleitung" },
          { label: "Vereinsentwicklung", href: "/vereinsleitung" },
          { label: "Strategie" },
        ]}
        isEmpty={false}
      >
        {authoring ? (
          <StrategyAuthoringPanel
            initial={authoring}
            canManage={canManageTargets}
            availableMeetings={availableMeetings}
            availableDecisions={availableDecisions}
          />
        ) : null}

        <div className="mb-3 space-y-1">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {CD_STRATEGY_AUTHORING_COPY.progressHeading}
          </h2>
          <p className="text-sm text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.progressHint}</p>
          <p className="text-xs text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.progressScopeNote}</p>
        </div>

        {targets.length === 0 ? (
          <div
            className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-10 text-center"
            data-testid="strategy-progress-empty"
          >
            <GoalSceIcon className="mx-auto mb-3 h-10 w-10 text-[var(--muted)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">Keine strategischen Ziele in der Übersicht</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {canManageTargets
                ? "Legen Sie Ziele unter Pläne & Ziele an oder verknüpfen Sie Schwerpunkte oben."
                : canViewTargets
                  ? "Noch keine sichtbaren Ziele."
                  : "Keine Berechtigung zum Anzeigen strategischer Ziele."}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {CD_STRATEGY_PROGRESS_COPY.progressOverviewVsFocusWhenEmpty}
            </p>
            {canManageTargets ? (
              <Link
                href="/vereinsleitung/targets/new"
                className="mt-4 inline-flex items-center rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Strategisches Ziel erfassen
              </Link>
            ) : null}
          </div>
        ) : (
          <StrategyOverviewPanel
            targets={targets}
            canManageTargets={canManageTargets}
            focusTargetIds={focusTargetIds}
          />
        )}
      </ListPagePattern>
    </PageShell>
  );
}
