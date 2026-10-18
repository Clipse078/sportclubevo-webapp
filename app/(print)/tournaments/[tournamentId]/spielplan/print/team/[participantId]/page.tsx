import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { loadTournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/load-tournament-spielplan.server";
import { resolveTeamSpielplan } from "@/lib/tournaments/spielplan/build-tournament-spielplan-view-model";
import SceTournamentTeamSpielplanDocument from "@/components/sce/tournament/SceTournamentTeamSpielplanDocument";
import SpielplanPrintTrigger from "@/components/sce/tournament/SpielplanPrintTrigger";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";
import { getTournament } from "@/lib/tournaments/tournament-service";

type Props = { params: Promise<{ tournamentId: string; participantId: string }> };

export default async function TournamentSpielplanTeamPrintPage({ params }: Props) {
  await requireAnyPermission([PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const { tournamentId, participantId } = await params;

  try {
    await getTournament(tenant.id, tournamentId);
  } catch (err) {
    if (err instanceof TournamentNotFoundError) notFound();
    throw err;
  }

  const model = await loadTournamentSpielplanViewModel({
    tenantId: tenant.id,
    tournamentId,
    timezone: tenant.timezone ?? "Europe/Zurich",
    tenantName: tenant.name,
    tenantLogoUrl: tenant.logoUrl,
  });

  const teamPlan = resolveTeamSpielplan(model, participantId);
  if (!teamPlan) notFound();

  return (
    <>
      <SpielplanPrintTrigger />
      <SceTournamentTeamSpielplanDocument model={model} teamPlan={teamPlan} />
    </>
  );
}
