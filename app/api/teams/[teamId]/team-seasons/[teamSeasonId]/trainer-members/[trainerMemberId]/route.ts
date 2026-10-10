import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { logAction } from "@/lib/audit/log-action";
import { removeTrainerTeamMembership } from "@/lib/teams/roster-membership-service";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string; trainerMemberId: string }>;
};

export async function DELETE(_: Request, context: Context) {
  const access = await requireApiPermission(PERMISSIONS.TEAMS_MANAGE);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandanten-Kontext." }, { status: 403 });
  }

  try {
    const { teamId, teamSeasonId, trainerMemberId } = await context.params;

    const result = await removeTrainerTeamMembership({
      tenantId,
      teamId,
      teamSeasonId,
      trainerMemberId,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.code === "MEMBERSHIP_NOT_FOUND" ? 404 : 500 },
      );
    }

    const existing = result.removed;

    await logAction({
      actorUserId:
        access.session?.user?.effectiveUserId ??
        access.session?.user?.id ??
        null,
      moduleKey: "teams",
      entityType: "TrainerTeamMember",
      entityId: trainerMemberId,
      action: "DELETE",
      beforeJson: existing,
      metadataJson: {
        teamId,
        teamSeasonId,
        personName:
          existing.person.displayName ||
          existing.person.firstName + " " + existing.person.lastName,
      },
    });

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/teams/" + teamId);

    return NextResponse.json({
      message: "Trainer erfolgreich aus dem Trainerteam entfernt.",
    });
  } catch (error) {
    console.error("Delete trainer member failed:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Technischer Fehler: " + error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Trainer konnte nicht aus dem Trainerteam entfernt werden." },
      { status: 500 },
    );
  }
}
