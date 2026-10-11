import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { PlayerReleaseRequestError } from "@/lib/match-squad/player-release-request-errors";

export function mapPlayerReleaseRequestRouteError(error: unknown): NextResponse {
  if (error instanceof PlayerReleaseRequestError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return NextResponse.json(
      {
        error:
          "Das Spieleranfrage-Schema ist auf dieser Umgebung noch nicht bereit. Bitte wenden Sie sich an den Support.",
        code: "SCHEMA_NOT_READY",
      },
      { status: 503 },
    );
  }
  console.error("[player-release-request]", error);
  return NextResponse.json(
    { error: "Spieleranfrage konnte nicht verarbeitet werden.", code: "INTERNAL" },
    { status: 500 },
  );
}
