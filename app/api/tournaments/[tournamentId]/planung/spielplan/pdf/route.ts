import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { loadTournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/load-tournament-spielplan.server";
import { resolveTeamSpielplan } from "@/lib/tournaments/spielplan/build-tournament-spielplan-view-model";
import { generateTournamentSpielplanPdf } from "@/lib/tournaments/spielplan/pdf/generate-tournament-spielplan-pdf";
import { TournamentNotFoundError } from "@/lib/tournaments/errors";
import { getTournament } from "@/lib/tournaments/tournament-service";

type RouteContext = { params: Promise<{ tournamentId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.EVENTS_VIEW, PERMISSIONS.EVENTS_MANAGE]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
  }

  const tenant = await getActiveTenant();
  const { tournamentId } = await params;
  const participantId = request.nextUrl.searchParams.get("participantId");

  try {
    await getTournament(tenantId, tournamentId);
  } catch (err) {
    if (err instanceof TournamentNotFoundError) {
      return NextResponse.json({ error: "Turnier nicht gefunden." }, { status: 404 });
    }
    throw err;
  }

  const model = await loadTournamentSpielplanViewModel({
    tenantId,
    tournamentId,
    timezone: tenant?.timezone ?? "Europe/Zurich",
    tenantName: tenant?.name ?? null,
    tenantLogoUrl: tenant?.logoUrl ?? null,
  });

  const teamPlan = participantId ? resolveTeamSpielplan(model, participantId) : null;
  if (participantId && !teamPlan) {
    return NextResponse.json({ error: "Teilnehmer nicht gefunden." }, { status: 404 });
  }

  const pdfBytes = await generateTournamentSpielplanPdf({
    model,
    mode: teamPlan ? "TEAM" : "MASTER",
    teamPlan,
  });

  const filename = teamPlan
    ? `team-spielplan-${tournamentId}-${participantId}.pdf`
    : `spielplan-${tournamentId}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
