import { NextResponse } from "next/server";
import { loadTournamentPlanungViewModel } from "./load-tournament-planung.server";
import { PLANUNG_STALE_SCHEDULE_USER_MESSAGE } from "./planung-schedule-mutation-errors";

export async function planungStaleScheduleVersionResponse(params: {
  tenantId: string;
  tournamentId: string;
  timezone: string;
  tenantName: string | null;
  tenantLogoUrl: string | null;
  code: string;
}) {
  const viewModel = await loadTournamentPlanungViewModel({
    tenantId: params.tenantId,
    tournamentId: params.tournamentId,
    timezone: params.timezone,
    tenantName: params.tenantName,
    tenantLogoUrl: params.tenantLogoUrl,
  });
  return NextResponse.json(
    { error: PLANUNG_STALE_SCHEDULE_USER_MESSAGE, code: params.code, viewModel },
    { status: 409 },
  );
}
