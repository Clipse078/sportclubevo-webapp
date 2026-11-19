import { NextResponse } from "next/server";
import {
  ClubMeldungSchemaUnavailableError,
  requireClubMeldungSchemaReady,
} from "@/lib/club-meldungen/schema-ready";

export async function meldungApiSchemaGuard(): Promise<NextResponse | null> {
  try {
    await requireClubMeldungSchemaReady();
    return null;
  } catch (error) {
    if (error instanceof ClubMeldungSchemaUnavailableError) {
      return NextResponse.json(
        { error: error.message, code: "SCHEMA_UNAVAILABLE" },
        { status: 503 },
      );
    }
    throw error;
  }
}