import { NextRequest, NextResponse } from "next/server";
import type { ClubMeldungCategory } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  ClubMeldungServiceError,
  createClubMeldung,
} from "@/lib/club-meldungen/meldung-service";
import { listClubMeldungen, type ClubMeldungListView } from "@/lib/club-meldungen/queries";
import { requireMeldungApiActor } from "@/lib/club-meldungen/tenant-api";
import { hasMeldungPermission } from "@/lib/club-meldungen/access";
import { meldungApiSchemaGuard } from "@/lib/club-meldungen/api-schema";

const CATEGORIES = new Set([
  "DAMAGE_OR_PROBLEM",
  "QUESTION_OR_SUPPORT",
  "IDEA_OR_IMPROVEMENT",
  "OTHER",
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> },
) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const { tenantSlug } = await context.params;
  const actorResult = await requireMeldungApiActor(tenantSlug, [
    PERMISSIONS.MELDUNGEN_SUBMIT,
    PERMISSIONS.MELDUNGEN_HANDLE,
    PERMISSIONS.MELDUNGEN_VIEW_ALL,
  ]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.error }, { status: actorResult.status });
  }

  const view = (request.nextUrl.searchParams.get("view") ?? "reporter") as ClubMeldungListView;
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const orgUnitId = request.nextUrl.searchParams.get("orgUnitId") ?? undefined;
  const accountableUserId = request.nextUrl.searchParams.get("accountableUserId") ?? undefined;

  const items = await listClubMeldungen({
    tenantId: actorResult.actor.tenantId,
    view,
    actorUserId: actorResult.actor.actorUserId,
    canViewAll: hasMeldungPermission(
      actorResult.actor.permissionKeys,
      PERMISSIONS.MELDUNGEN_VIEW_ALL,
    ),
    status: status as never,
    orgUnitId: orgUnitId || undefined,
    accountableUserId: accountableUserId || undefined,
  });

  return NextResponse.json({ items });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> },
) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const { tenantSlug } = await context.params;
  const actorResult = await requireMeldungApiActor(tenantSlug, [PERMISSIONS.MELDUNGEN_SUBMIT]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.error }, { status: actorResult.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const idempotencyKey =
    typeof data.idempotencyKey === "string" && data.idempotencyKey.trim()
      ? data.idempotencyKey.trim()
      : request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Idempotency-Key fehlt" }, { status: 400 });
  }

  const category = data.category;
  if (typeof category !== "string" || !CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Kategorie ungültig" }, { status: 400 });
  }

  try {
    const result = await createClubMeldung({
      tenantId: actorResult.actor.tenantId,
      reporterUserId: actorResult.actor.actorUserId,
      subject: String(data.subject ?? ""),
      description: String(data.description ?? ""),
      category: category as ClubMeldungCategory,
      locationHint: typeof data.locationHint === "string" ? data.locationHint : null,
      urgent: Boolean(data.urgent),
      urgentNote: typeof data.urgentNote === "string" ? data.urgentNote : null,
      idempotencyKey,
      attachmentIds: Array.isArray(data.attachmentIds)
        ? data.attachmentIds.filter((id): id is string => typeof id === "string")
        : [],
    });
    return NextResponse.json(
      {
        meldung: result.meldung,
        created: result.created,
        publicReference: result.publicReference,
      },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof ClubMeldungServiceError) {
      const status =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "VALIDATION"
            ? 400
            : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("Create meldung failed", error);
    return NextResponse.json({ error: "Meldung konnte nicht erstellt werden" }, { status: 500 });
  }
}