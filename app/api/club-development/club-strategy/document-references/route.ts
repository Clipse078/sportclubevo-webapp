import { NextRequest, NextResponse } from "next/server";
import { ClubStrategyDocumentKind } from "@prisma/client";
import {
  linkClubStrategyDocument,
  unlinkClubStrategyDocument,
  searchClubStrategyDocumentCandidates,
  listClubStrategyDocumentVersions,
} from "@/lib/club-development/club-strategy-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

const VALID_KINDS = new Set(Object.values(ClubStrategyDocumentKind));

export async function GET(request: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_VIEW,
    PERMISSIONS.TARGETS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const mode = request.nextUrl.searchParams.get("mode");
  if (mode === "search") {
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const options = await searchClubStrategyDocumentCandidates(
      access.context.actor,
      access.context.actorUserId,
      q,
    );
    return NextResponse.json({ options });
  }

  if (mode === "versions") {
    const documentId = request.nextUrl.searchParams.get("documentId")?.trim() ?? "";
    if (!documentId) {
      return NextResponse.json({ error: "documentId required" }, { status: 400 });
    }
    try {
      const versions = await listClubStrategyDocumentVersions(
        access.context.actor,
        access.context.actorUserId,
        documentId,
      );
      return NextResponse.json(versions);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const documentId = typeof body?.documentId === "string" ? body.documentId.trim() : "";
  const kind = body?.kind as ClubStrategyDocumentKind;
  if (!documentId || !VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: "documentId und kind sind erforderlich." }, { status: 400 });
  }

  try {
    await linkClubStrategyDocument(access.context.actor, access.context.actorUserId, {
      kind,
      documentId,
      workspaceDocumentVersionId: body?.workspaceDocumentVersionId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "DOCUMENT_FORBIDDEN") {
      return NextResponse.json({ error: "Dokument nicht verfügbar." }, { status: 403 });
    }
    return NextResponse.json({ error: "Verknüpfung fehlgeschlagen." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;

  const referenceId = request.nextUrl.searchParams.get("referenceId")?.trim() ?? "";
  if (!referenceId) {
    return NextResponse.json({ error: "referenceId ist erforderlich." }, { status: 400 });
  }

  try {
    await unlinkClubStrategyDocument(access.context.actor, access.context.actorUserId, referenceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Entfernen fehlgeschlagen." }, { status: 500 });
  }
}