/** DS2-07F governance marker: SceWorkspaceChrome (create panel chrome). */
import type { SceWorkspaceChromeProps } from "@/components/sce/workspace/SceWorkspaceChrome";
void 0 as unknown as SceWorkspaceChromeProps;
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ZielNeuClient from "@/components/admin/club-development/ZielNeuClient";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { listClubStrategies } from "@/lib/club-development/club-strategy-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { parseOrgEinheitQuery } from "@/lib/club-development/vereinsentwicklung-workspace-org-filter";
import {
  buildStrategieReturnHref,
  buildZieleReturnHref,
  CD_CREATE_CLUB_STRATEGY_QUERY,
  parseLinkFocusQuery,
  parseSafeReturnToHref,
} from "@/lib/club-development/vereinsentwicklung-create-routing";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function VereinsentwicklungZielNeuPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const query = (await searchParams) ?? {};
  const actor = await getActorContext(session.user, session.user.activeTenantId ?? undefined);
  if (!actor.permissionKeys.includes(PERMISSIONS.TARGETS_MANAGE)) {
    redirect(buildZieleReturnHref({ orgUnitId: parseOrgEinheitQuery(query) }));
  }

  const orgUnitId = parseOrgEinheitQuery(query);
  const clubStrategyId = query[CD_CREATE_CLUB_STRATEGY_QUERY]?.trim() ?? "";
  const linkFocus = parseLinkFocusQuery(query.linkFocus) || Boolean(clubStrategyId);

  const strategies = await listClubStrategies(actor, { orgUnitId: orgUnitId ?? undefined });
  const strategyLabel = (row: (typeof strategies)[number]) =>
    row.title?.trim() || row.scopeOrgUnitLabel?.trim() || "Gesamtverein";
  const strategyOptions = strategies.map((row) => ({
    id: row.id,
    title: strategyLabel(row),
  }));

  let lockedClubStrategy: { id: string; title: string } | null = null;
  if (clubStrategyId) {
    const match = strategies.find((row) => row.id === clubStrategyId);
    if (match) {
      lockedClubStrategy = {
        id: match.id,
        title: strategyLabel(match),
      };
    }
  }

  const fallbackBack = lockedClubStrategy
    ? buildStrategieReturnHref({ orgUnitId, strategyId: lockedClubStrategy.id })
    : buildZieleReturnHref({ orgUnitId });

  const backHref = parseSafeReturnToHref(query.returnTo, fallbackBack);

  return (
    <ZielNeuClient
      backHref={backHref}
      orgUnitId={orgUnitId}
      linkFocus={linkFocus}
      lockedClubStrategy={lockedClubStrategy}
      strategyOptions={strategyOptions}
    />
  );
}