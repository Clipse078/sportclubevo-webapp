import { NextRequest, NextResponse } from "next/server";
import { Prisma, PlayerSquadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { logAction } from "@/lib/audit/log-action";
import { addPlayerToTeamSeason } from "@/lib/teams/roster-membership-service";

type Context = {
  params: Promise<{ teamId: string; teamSeasonId: string }>;
};

const ALLOWED_STATUSES = ["ACTIVE", "INACTIVE", "INJURED", "ABSENT", "ARCHIVED"] as const;

function rosterErrorStatus(code: string): number {
  switch (code) {
    case "TEAM_SEASON_NOT_FOUND":
    case "PERSON_NOT_FOUND":
      return 404;
    case "PERSON_NOT_ELIGIBLE":
    case "JAHRGANG_NOT_ALLOWED":
    case "TEAM_SEASON_NOT_MUTABLE":
      return 400;
    case "ALREADY_ACTIVE_MEMBER":
      return 409;
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
    const shirtNumber =
      body.shirtNumber === null || body.shirtNumber === undefined || body.shirtNumber === ""
        ? null
        : Number(body.shirtNumber);
    const positionLabel =
      body.positionLabel === null || body.positionLabel === undefined
        ? null
        : String(body.positionLabel).trim() || null;
    const isCaptain = Boolean(body.isCaptain);
    const isViceCaptain = Boolean(body.isViceCaptain);
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
        { error: "Ungültiger Kader-Status." },
        { status: 400 },
      );
    }

    if (shirtNumber !== null && !Number.isInteger(shirtNumber)) {
      return NextResponse.json(
        { error: "Rückennummer muss eine ganze Zahl sein." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(sortOrder)) {
      return NextResponse.json(
        { error: "Sortierung muss eine Zahl sein." },
        { status: 400 },
      );
    }

    const result = await addPlayerToTeamSeason({
      tenantId,
      teamId,
      teamSeasonId,
      personId,
      status: status as PlayerSquadStatus,
      shirtNumber,
      positionLabel,
      isCaptain,
      isViceCaptain,
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
        { error: "Diese Person ist diesem Team-Saison-Kader bereits zugewiesen." },
        { status: 409 },
      );
    }

    const { squadMember, teamSeason, personSummary, jahrgang } = result;

    await logAction({
      actorUserId:
        access.session?.user?.effectiveUserId ??
        access.session?.user?.id ??
        null,
      moduleKey: "teams",
      entityType: "PlayerSquadMember",
      entityId: squadMember.id,
      action: result.outcome === "REACTIVATED" ? "UPDATE" : "CREATE",
      afterJson: {
        teamSeasonId,
        personId,
        status: squadMember.status,
        shirtNumber: squadMember.shirtNumber,
        positionLabel: squadMember.positionLabel,
        isCaptain: squadMember.isCaptain,
        isViceCaptain: squadMember.isViceCaptain,
        isWebsiteVisible: squadMember.isWebsiteVisible,
        sortOrder: squadMember.sortOrder,
        remarks: squadMember.remarks,
      },
      metadataJson: {
        teamId: teamSeason.team.id,
        teamName: teamSeason.team.name,
        teamSlug: teamSeason.team.slug,
        teamAgeGroup: teamSeason.team.ageGroup,
        seasonId: teamSeason.season.id,
        seasonKey: teamSeason.season.key,
        seasonName: teamSeason.season.name,
        allowedBirthYears: jahrgang?.allowedBirthYears ?? [],
        personBirthYear: jahrgang?.birthYear ?? null,
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
            ? "Spieler erfolgreich dem Team-Saison-Kader wieder zugeordnet."
            : "Spieler erfolgreich dem Team-Saison-Kader hinzugefügt.",
        squadMember,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create squad member failed:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Diese Person ist diesem Team-Saison-Kader bereits zugewiesen." },
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
      { error: "Spieler konnte nicht dem Team-Saison-Kader hinzugefügt werden." },
      { status: 500 },
    );
  }
}
