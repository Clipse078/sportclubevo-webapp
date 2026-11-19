import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  ClubMeldungServiceError,
  markClubMeldungDuplicate,
} from "@/lib/club-meldungen/meldung-service";
import { meldungApiSchemaGuard } from "@/lib/club-meldungen/api-schema";
import {
  assertMeldungMutable,
  assertMeldungReadable,
  requireMeldungApiActor,
} from "@/lib/club-meldungen/tenant-api";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string; meldungId: string }> },
) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const { tenantSlug, meldungId } = await context.params;
  const actorResult = await requireMeldungApiActor(tenantSlug, [
    PERMISSIONS.MELDUNGEN_HANDLE,
    PERMISSIONS.MELDUNGEN_VIEW_ALL,
  ]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.error }, { status: actorResult.status });
  }

  const readable = await assertMeldungReadable(actorResult.actor, meldungId);
  if (!readable.ok) {
    return NextResponse.json({ error: readable.error }, { status: readable.status });
  }

  const mutable = assertMeldungMutable(actorResult.actor, readable.meldung);
  if (!mutable.ok) {
    return NextResponse.json({ error: mutable.error }, { status: mutable.status });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.duplicateOfId !== "string") {
    return NextResponse.json({ error: "duplicateOfId fehlt" }, { status: 400 });
  }
  const expectedVersion = Number(body.expectedVersion);
  if (!Number.isInteger(expectedVersion)) {
    return NextResponse.json({ error: "Version fehlt" }, { status: 400 });
  }

  try {
    const meldung = await markClubMeldungDuplicate({
      tenantId: actorResult.actor.tenantId,
      meldungId,
      duplicateOfId: body.duplicateOfId,
      actorUserId: actorResult.actor.actorUserId,
      expectedVersion,
      permissionKeys: actorResult.actor.permissionKeys,
    });
    return NextResponse.json({ meldung });
  } catch (error) {
    if (error instanceof ClubMeldungServiceError) {
      const status =
        error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: "Duplikat konnte nicht verknüpft werden" }, { status: 500 });
  }
}