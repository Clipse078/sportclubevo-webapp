/**
 * Maps persistence failures for playing-units API routes to actionable SCE responses.
 */

import { Prisma } from "@prisma/client";

export type PlayingUnitsErrorKind =
  | "load"
  | "mutation"
  | "permission"
  | "not_found"
  | "database";

export type PlayingUnitsRouteError = {
  status: number;
  error: string;
  errorKind: PlayingUnitsErrorKind;
};

export function mapPlayingUnitsPersistenceError(
  err: unknown,
  context: "load" | "mutation" = "load",
): PlayingUnitsRouteError | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2021") {
      return {
        status: 503,
        error:
          context === "mutation"
            ? "Spielteams konnten nicht erstellt werden (Datenbankschema fehlt). Bitte Migration ausführen."
            : "Spielteams konnten nicht geladen werden (Datenbankschema fehlt). Bitte Migration ausführen.",
        errorKind: "database",
      };
    }
    if (err.code === "P2022") {
      return {
        status: 503,
        error:
          context === "mutation"
            ? "Spielteams konnten nicht erstellt werden (veraltetes Datenbankschema). Bitte Migration anwenden."
            : "Spielteams konnten nicht geladen werden (veraltetes Datenbankschema). Bitte Migration anwenden.",
        errorKind: "database",
      };
    }
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    return {
      status: 503,
      error: "Datenbank vorübergehend nicht erreichbar. Bitte später erneut versuchen.",
      errorKind: "database",
    };
  }

  if (err instanceof Error && /does not exist/i.test(err.message)) {
    return {
      status: 503,
      error:
        context === "mutation"
          ? "Spielteams konnten nicht erstellt werden (Datenbankschema fehlt). Bitte Migration ausführen."
          : "Spielteams konnten nicht geladen werden (Datenbankschema fehlt). Bitte Migration ausführen.",
      errorKind: "database",
    };
  }

  return null;
}
