import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { updateEventParticipationRequestConfig } from "@/lib/participation/participation-request-config-service";
import { ParticipationEventNotFoundError, ParticipationValidationError } from "@/lib/participation/errors";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireAnyPermission([
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.EVENTS_VIEW,
  ]);

  const tenantId = session.user?.activeTenantId;
  const userId = session.user?.id ?? null;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant required" }, { status: 401 });
  }

  const { eventId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  try {
    await updateEventParticipationRequestConfig(
      tenantId,
      eventId,
      {
        participationResponseDueAt:
          body?.participationResponseDueAt === null
            ? null
            : typeof body?.participationResponseDueAt === "string"
              ? new Date(body.participationResponseDueAt)
              : undefined,
        participationReminder1At:
          body?.participationReminder1At === null
            ? null
            : typeof body?.participationReminder1At === "string"
              ? new Date(body.participationReminder1At)
              : undefined,
        participationReminder2At:
          body?.participationReminder2At === null
            ? null
            : typeof body?.participationReminder2At === "string"
              ? new Date(body.participationReminder2At)
              : undefined,
        participationReminder1PresetKey:
          body?.participationReminder1PresetKey === null
            ? null
            : typeof body?.participationReminder1PresetKey === "string"
              ? body.participationReminder1PresetKey
              : undefined,
        participationReminder2PresetKey:
          body?.participationReminder2PresetKey === null
            ? null
            : typeof body?.participationReminder2PresetKey === "string"
              ? body.participationReminder2PresetKey
              : undefined,
      },
      userId,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ParticipationEventNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof ParticipationValidationError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
