import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { searchMeldungMentionCandidates } from "@/lib/club-meldungen/meldung-mention-candidates";
import {
  assertMeldungMutable,
  assertMeldungReadable,
  requireMeldungApiActor,
} from "@/lib/club-meldungen/tenant-api";
import { meldungApiSchemaGuard } from "@/lib/club-meldungen/api-schema";
import {
  CLUB_MELDUNG_MENTION_SCHEMA_PREREQUISITE,
  isClubMeldungMentionSchemaReady,
} from "@/lib/club-meldungen/schema-mention-ready";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string; meldungId: string }> },
) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const mentionReady = await isClubMeldungMentionSchemaReady();
  if (!mentionReady) {
    return NextResponse.json(
      { error: CLUB_MELDUNG_MENTION_SCHEMA_PREREQUISITE, code: "SCHEMA_UNAVAILABLE" },
      { status: 503 },
    );
  }

  const { tenantSlug, meldungId } = await context.params;
  const q = request.nextUrl.searchParams.get("q") ?? "";

  const actorResult = await requireMeldungApiActor(tenantSlug, [PERMISSIONS.MELDUNGEN_HANDLE]);
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

  const candidates = await searchMeldungMentionCandidates({
    tenantId: actorResult.actor.tenantId,
    meldungId,
    actorUserId: actorResult.actor.actorUserId,
    search: q,
  });

  return NextResponse.json({
    candidates: candidates.map((row) => ({
      id: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName,
    })),
  });
}