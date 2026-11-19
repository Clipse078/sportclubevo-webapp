import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ClubMeldungServiceError } from "@/lib/club-meldungen/meldung-service";
import { meldungApiSchemaGuard } from "@/lib/club-meldungen/api-schema";
import { createClubMeldungLinkedTask } from "@/lib/club-meldungen/task-link";
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
    PERMISSIONS.TASKS_CREATE,
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
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Titel fehlt" }, { status: 400 });
  }

  try {
    const task = await createClubMeldungLinkedTask(
      {
        tenantId: actorResult.actor.tenantId,
        userId: actorResult.actor.actorUserId,
        permissionKeys: actorResult.actor.permissionKeys,
      },
      {
        meldungId,
        title: body.title.trim(),
        description: typeof body.description === "string" ? body.description : null,
        access: {
          actorUserId: actorResult.actor.actorUserId,
          permissionKeys: actorResult.actor.permissionKeys,
          collaboratorUserIds: readable.meldung.collaborators.map((c) => c.userId),
        },
      },
    );
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof ClubMeldungServiceError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "FORBIDDEN" ? 403 : 400 },
      );
    }
    console.error("Create meldung linked task failed", error);
    return NextResponse.json({ error: "Aufgabe konnte nicht erstellt werden" }, { status: 500 });
  }
}