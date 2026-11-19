import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { meldungApiSchemaGuard } from "@/lib/club-meldungen/api-schema";
import { requireMeldungApiActor } from "@/lib/club-meldungen/tenant-api";
import { searchClubMeldungenForDuplicateLink } from "@/lib/club-meldungen/duplicate-lookup";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> },
) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const { tenantSlug } = await context.params;
  const actorResult = await requireMeldungApiActor(tenantSlug, [PERMISSIONS.MELDUNGEN_HANDLE]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.error }, { status: actorResult.status });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const excludeMeldungId = request.nextUrl.searchParams.get("exclude") ?? "";

  if (!excludeMeldungId.trim()) {
    return NextResponse.json({ error: "exclude fehlt" }, { status: 400 });
  }

  const items = await searchClubMeldungenForDuplicateLink({
    tenantId: actorResult.actor.tenantId,
    query,
    excludeMeldungId: excludeMeldungId.trim(),
    access: {
      actorUserId: actorResult.actor.actorUserId,
      permissionKeys: actorResult.actor.permissionKeys,
    },
  });

  return NextResponse.json({ items });
}