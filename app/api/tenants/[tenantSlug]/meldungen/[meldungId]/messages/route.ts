import { NextRequest, NextResponse } from "next/server";
import { ClubMeldungMessageAudience } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ClubMeldungServiceError, postClubMeldungMessage } from "@/lib/club-meldungen/meldung-service";
import {
  assertMeldungMutable,
  assertMeldungReadable,
  requireMeldungApiActor,
} from "@/lib/club-meldungen/tenant-api";
import { canViewMeldungAsReporter } from "@/lib/club-meldungen/access";
import { meldungApiSchemaGuard } from "@/lib/club-meldungen/api-schema";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string; meldungId: string }> },
) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const { tenantSlug, meldungId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.body !== "string") {
    return NextResponse.json({ error: "Nachricht fehlt" }, { status: 400 });
  }

  const asReporter = Boolean(body.asReporter);
  const audience = body.audience;

  const actorResult = await requireMeldungApiActor(
    tenantSlug,
    asReporter ? [PERMISSIONS.MELDUNGEN_SUBMIT] : [PERMISSIONS.MELDUNGEN_HANDLE],
  );
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.error }, { status: actorResult.status });
  }

  const readable = await assertMeldungReadable(actorResult.actor, meldungId);
  if (!readable.ok) {
    return NextResponse.json({ error: readable.error }, { status: readable.status });
  }

  if (!asReporter) {
    const mutable = assertMeldungMutable(actorResult.actor, readable.meldung);
    if (!mutable.ok) {
      return NextResponse.json({ error: mutable.error }, { status: mutable.status });
    }
  }

  if (
    asReporter &&
    !canViewMeldungAsReporter(
      readable.meldung,
      actorResult.actor.actorUserId,
      actorResult.actor.permissionKeys,
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resolvedAudience = asReporter
    ? ClubMeldungMessageAudience.REPORTER_REPLY
    : audience === "INTERNAL_NOTE"
      ? ClubMeldungMessageAudience.INTERNAL_NOTE
      : ClubMeldungMessageAudience.REPORTER_REPLY;

  try {
    const message = await postClubMeldungMessage({
      tenantId: actorResult.actor.tenantId,
      meldungId,
      actorUserId: actorResult.actor.actorUserId,
      audience: resolvedAudience,
      body: body.body,
      asReporter,
    });
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof ClubMeldungServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "FORBIDDEN" ? 403 : 400 },
      );
    }
    return NextResponse.json({ error: "Nachricht konnte nicht gesendet werden" }, { status: 500 });
  }
}