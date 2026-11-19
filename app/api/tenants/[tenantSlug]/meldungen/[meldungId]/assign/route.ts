import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { assignClubMeldung, ClubMeldungServiceError } from "@/lib/club-meldungen/meldung-service";
import { assertMeldungReadable, requireMeldungApiActor } from "@/lib/club-meldungen/tenant-api";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string; meldungId: string }> },
) {
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const expectedVersion = Number(body.expectedVersion);
  if (!Number.isInteger(expectedVersion)) {
    return NextResponse.json({ error: "Version fehlt" }, { status: 400 });
  }

  try {
    const updated = await assignClubMeldung({
      tenantId: actorResult.actor.tenantId,
      meldungId,
      actorUserId: actorResult.actor.actorUserId,
      accountableUserId:
        body.accountableUserId === null
          ? null
          : typeof body.accountableUserId === "string"
            ? body.accountableUserId
            : null,
      orgUnitId:
        typeof body.orgUnitId === "string" ? body.orgUnitId : body.orgUnitId === null ? null : undefined,
      collaboratorUserIds: Array.isArray(body.collaboratorUserIds)
        ? body.collaboratorUserIds.filter((id): id is string => typeof id === "string")
        : undefined,
      awaitedExternalParty:
        typeof body.awaitedExternalParty === "string" ? body.awaitedExternalParty : undefined,
      expectedVersion,
    });
    return NextResponse.json({ meldung: updated });
  } catch (error) {
    if (error instanceof ClubMeldungServiceError) {
      const status =
        error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status: status });
    }
    return NextResponse.json({ error: "Zuweisung fehlgeschlagen" }, { status: 500 });
  }
}