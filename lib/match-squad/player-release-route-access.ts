import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  resolvePlayerReleaseAccess,
  type PlayerReleaseAccess,
} from "@/lib/match-squad/player-release-auth";
import { PlayerReleaseError } from "@/lib/match-squad/player-release-errors";

export function mapPlayerReleaseRouteError(error: unknown): NextResponse {
  if (error instanceof PlayerReleaseError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return NextResponse.json(
      {
        error:
          "Das Spielerfreigabe-Schema ist auf dieser Umgebung noch nicht bereit. Bitte wenden Sie sich an den Support.",
        code: "SCHEMA_NOT_READY",
      },
      { status: 503 },
    );
  }
  console.error("[player-release]", error);
  return NextResponse.json(
    { error: "Spielerfreigabe konnte nicht verarbeitet werden.", code: "INTERNAL" },
    { status: 500 },
  );
}

export async function resolvePlayerReleaseRouteAccess(input: {
  teamId: string;
  teamSeasonId: string;
}): Promise<
  | {
      ok: true;
      tenant: { id: string; key: string; timezone: string | null };
      userId: string;
      access: PlayerReleaseAccess;
    }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const tenant = await getActiveTenant();
  if (!tenant) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Tenant context required" }, { status: 400 }),
    };
  }

  const userId = session.user.effectiveUserId ?? session.user.id;
  const access = await resolvePlayerReleaseAccess({
    userId,
    tenantId: tenant.id,
    tenantKey: tenant.key,
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId,
  });

  if (!access) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Team nicht gefunden." }, { status: 404 }),
    };
  }

  return {
    ok: true,
    tenant: { id: tenant.id, key: tenant.key, timezone: tenant.timezone ?? "Europe/Zurich" },
    userId,
    access,
  };
}
