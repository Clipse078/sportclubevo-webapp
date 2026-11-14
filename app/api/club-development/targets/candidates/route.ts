import { NextRequest, NextResponse } from "next/server";
import { searchTargetCandidates } from "@/lib/club-development/target-candidates";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

export async function GET(req: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_VIEW,
    PERMISSIONS.TARGETS_MANAGE,
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  const targets = await searchTargetCandidates(access.context.actor, q, limit);
  return NextResponse.json({ targets });
}