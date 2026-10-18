import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { loadTournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/load-tournament-spielplan.server";
import SceTournamentSpielplanDocument from "@/components/sce/tournament/SceTournamentSpielplanDocument";
import SpielplanPrintTrigger from "@/components/sce/tournament/SpielplanPrintTrigger";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";
import { getTournament } from "@/lib/tournaments/tournament-service";

type Props = { params: Promise<{ tournamentId: string }> };

export default async function TournamentSpielplanMasterPrintPage({ params }: Props) {
  await requireAnyPermission([PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE]);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();
  const { tournamentId } = await params;

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

  return (
    <>
      <SpielplanPrintTrigger />
      <SceTournamentSpielplanDocument model={model} />
    </>
  );
}
