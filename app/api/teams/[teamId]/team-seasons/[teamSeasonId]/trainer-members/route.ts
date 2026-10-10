import { NextRequest, NextResponse } from "next/server";
import { Prisma, TrainerTeamStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { logAction } from "@/lib/audit/log-action";
import { addTrainerToTeamSeason } from "@/lib/teams/roster-membership-service";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string }>;
};

const ALLOWED_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

function rosterErrorStatus(code: string): number {
  switch (code) {
    case "TEAM_SEASON_NOT_FOUND":
    case "PERSON_NOT_FOUND":
      return 404;
    case "PERSON_NOT_ELIGIBLE":
    case "TEAM_SEASON_NOT_MUTABLE":
      return 400;
    default:
      return 500;
  }
}

export async function POST(request: NextRequest, context: Context) {
  const access = await requireApiPermission(PERMISSIONS.TEAMS_MANAGE);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandanten-Kontext." }, { status: 403 });
  }

  try {
    const { teamId, teamSeasonId } = await context.params;
    const body = await request.json();

    const personId = String(body.personId ?? "").trim();
    const status = String(body.status ?? "ACTIVE").trim();
    const roleLabel =
      body.roleLabel === null || body.roleLabel === undefined
        ? null
        : String(body.roleLabel).trim() || null;
    const isWebsiteVisible =
      body.isWebsiteVisible === null || body.isWebsiteVisible === undefined
        ? true
        : Boolean(body.isWebsiteVisible);
    const sortOrder =
      body.sortOrder === null || body.sortOrder === undefined || body.sortOrder === ""
        ? 0
        : Number(body.sortOrder);
    const remarks =
      body.remarks === null || body.remarks === undefined
        ? null
        : String(body.remarks).trim() || null;

    if (!personId) {
      return NextResponse.json(
        { error: "Bitte eine Person auswählen." },
        { status: 400 },
      );
    }

    if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      return NextResponse.json(
        { error: "Ungültiger Trainer-Status." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(sortOrder)) {
      return NextResponse.json(
        { error: "Sortierung muss eine Zahl sein." },
        { status: 400 },
      );
    }

    const result = await addTrainerToTeamSeason({
      tenantId,
      teamId,
      teamSeasonId,
      personId,
      status: status as TrainerTeamStatus,
      roleLabel,
      isWebsiteVisible,
      sortOrder,
      remarks,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: rosterErrorStatus(result.code) },
      );
    }

    if (result.outcome === "ALREADY_ACTIVE") {
      return NextResponse.json(
        { error: "Diese Person ist diesem Trainerteam bereits zugewiesen." },
        { status: 409 },
      );
    }

    const { trainerMember, teamSeason, personSummary } = result;

    await logAction({
      actorUserId:
        access.session?.user?.effectiveUserId ??
        access.session?.user?.id ??
        null,
      moduleKey: "teams",
      entityType: "TrainerTeamMember",
      entityId: trainerMember.id,
      action: result.outcome === "REACTIVATED" ? "UPDATE" : "CREATE",
      afterJson: {
        teamSeasonId,
        personId,
        status: trainerMember.status,
        roleLabel: trainerMember.roleLabel,
        isWebsiteVisible: trainerMember.isWebsiteVisible,
        sortOrder: trainerMember.sortOrder,
        remarks: trainerMember.remarks,
      },
      metadataJson: {
        teamId: teamSeason.team.id,
        teamName: teamSeason.team.name,
        teamSlug: teamSeason.team.slug,
        seasonId: teamSeason.season.id,
        seasonKey: teamSeason.season.key,
        seasonName: teamSeason.season.name,
        personName:
          personSummary.displayName ||
          personSummary.firstName + " " + personSummary.lastName,
        rosterOutcome: result.outcome,
      },
    });

    revalidatePath("/dashboard/teams");
    revalidatePath("/dashboard/teams/" + teamId);

    return NextResponse.json(
      {
        message:
          result.outcome === "REACTIVATED"
            ? "Trainer erfolgreich dem Trainerteam wieder zugeordnet."
            : "Trainer erfolgreich dem Trainerteam hinzugefügt.",
        trainerMember,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create trainer member failed:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Diese Person ist diesem Trainerteam bereits zugewiesen." },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: "Datenbankfehler: " + error.code + "." },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        {
          error:
            "Prisma-Validierungsfehler. Wahrscheinlich stimmen Schema, Migration und generierter Client aktuell nicht überein.",
        },
        { status: 500 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Technischer Fehler: " + error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Trainer konnte nicht dem Trainerteam hinzugefügt werden." },
      { status: 500 },
    );
  }
}
