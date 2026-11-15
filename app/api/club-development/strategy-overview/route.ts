import { NextResponse } from "next/server";
import { loadStrategyOverview } from "@/lib/club-development/strategy-overview";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function GET() {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_VIEW,
    PERMISSIONS.TARGETS_MANAGE,
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const overview = await loadStrategyOverview(access.context.actor);
  return NextResponse.json(overview);
}
