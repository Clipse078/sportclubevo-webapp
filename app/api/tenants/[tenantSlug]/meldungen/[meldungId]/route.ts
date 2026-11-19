import { NextRequest, NextResponse } from "next/server";
import { ClubMeldungStatus } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  ClubMeldungServiceError,
  updateClubMeldungStatus,
} from "@/lib/club-meldungen/meldung-service";
import { listClubMeldungReporterTimeline } from "@/lib/club-meldungen/queries";
import {
  assertMeldungMutable,
  assertMeldungReadable,
  requireMeldungApiActor,
} from "@/lib/club-meldungen/tenant-api";
import { canViewMeldungAsReporter, canViewMeldungInternal } from "@/lib/club-meldungen/access";
import { meldungApiSchemaGuard } from "@/lib/club-meldungen/api-schema";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ tenantSlug: string; meldungId: string }> },
) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const { tenantSlug, meldungId } = await context.params;
  const actorResult = await requireMeldungApiActor(tenantSlug, [
    PERMISSIONS.MELDUNGEN_SUBMIT,
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

  const asReporter = canViewMeldungAsReporter(
    readable.meldung,
    actorResult.actor.actorUserId,
    actorResult.actor.permissionKeys,
  );
  const asInternal = canViewMeldungInternal(readable.meldung, {
    actorUserId: actorResult.actor.actorUserId,
    permissionKeys: actorResult.actor.permissionKeys,
    collaboratorUserIds: readable.meldung.collaborators.map((c) => c.userId),
  });

  const timeline = await listClubMeldungReporterTimeline(
    actorResult.actor.tenantId,
    meldungId,
    asInternal,
  );

  const reporterSafeMeldung = {
    ...readable.meldung,
    waitReason: asInternal ? readable.meldung.waitReason : undefined,
    collaborators: asInternal ? readable.meldung.collaborators : [],
    accountableUser: asInternal ? readable.meldung.accountableUser : null,
    orgUnit: asInternal ? readable.meldung.orgUnit : null,
  };

  return NextResponse.json({
    meldung: reporterSafeMeldung,
    timeline,
    mode: asReporter && !asInternal ? "reporter" : asInternal ? "internal" : "reporter",
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string; meldungId: string }> },
) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const { tenantSlug, meldungId } = await context.params;
  const actorResult = await requireMeldungApiActor(tenantSlug, [PERMISSIONS.MELDUNGEN_HANDLE]);
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
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const expectedVersion = Number(body.expectedVersion);
  if (!Number.isInteger(expectedVersion)) {
    return NextResponse.json({ error: "Version fehlt" }, { status: 400 });
  }

  const status = body.status;
  if (typeof status !== "string" || !Object.values(ClubMeldungStatus).includes(status as ClubMeldungStatus)) {
    return NextResponse.json({ error: "Status ungültig" }, { status: 400 });
  }

  try {
    const updated = await updateClubMeldungStatus({
      tenantId: actorResult.actor.tenantId,
      meldungId,
      actorUserId: actorResult.actor.actorUserId,
      status: status as ClubMeldungStatus,
      waitReason: typeof body.waitReason === "string" ? body.waitReason : null,
      resolutionSummary:
        typeof body.resolutionSummary === "string" ? body.resolutionSummary : null,
      reopenReason: typeof body.reopenReason === "string" ? body.reopenReason : null,
      expectedVersion,
      nextStep: typeof body.nextStep === "string" ? body.nextStep : undefined,
      followUpAt: body.followUpAt ? new Date(String(body.followUpAt)) : undefined,
      nextFeedbackAt: body.nextFeedbackAt ? new Date(String(body.nextFeedbackAt)) : undefined,
    });
    return NextResponse.json({ meldung: updated });
  } catch (error) {
    if (error instanceof ClubMeldungServiceError) {
      const statusCode =
        error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status: statusCode });
    }
    return NextResponse.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 });
  }
}