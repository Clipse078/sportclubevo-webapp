import { NextRequest, NextResponse } from "next/server";
import { InitiativeDisposition, InitiativeStatus } from "@prisma/client";
import { listInitiativeBacklog } from "@/lib/club-development/initiative-backlog";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

function parseStatus(raw: string | null): InitiativeStatus[] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((s) => s.trim()) as InitiativeStatus[];
  const valid = parts.filter((s) => Object.values(InitiativeStatus).includes(s));
  return valid.length > 0 ? valid : undefined;
}

function parseDisposition(raw: string | null): InitiativeDisposition[] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((s) => s.trim()) as InitiativeDisposition[];
  const valid = parts.filter((s) => Object.values(InitiativeDisposition).includes(s));
  return valid.length > 0 ? valid : undefined;
}

export async function GET(req: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const ownerPersonId = req.nextUrl.searchParams.get("ownerPersonId") ?? undefined;
  const status = parseStatus(req.nextUrl.searchParams.get("status"));
  const disposition = parseDisposition(req.nextUrl.searchParams.get("disposition"));

  const initiatives = await listInitiativeBacklog(access.context.actor, {
    search,
    ownerPersonId,
    status,
    disposition,
  });
  return NextResponse.json({ initiatives });
}
