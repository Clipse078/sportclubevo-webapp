import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { CommunicationAttachmentServiceError } from "@/lib/communication/attachment-service";
import { meldungApiSchemaGuard } from "@/lib/club-meldungen/api-schema";
import { downloadClubMeldungLinkedAttachment } from "@/lib/club-meldungen/attachment-access";
import { requireMeldungApiActor } from "@/lib/club-meldungen/tenant-api";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ tenantSlug: string; clubMeldungAttachmentId: string }>;
};

function attachmentDisposition(filename: string, inline: boolean): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const kind = inline ? "inline" : "attachment";
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: NextRequest, context: Context) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const { tenantSlug, clubMeldungAttachmentId } = await context.params;
  const actorResult = await requireMeldungApiActor(tenantSlug, [
    PERMISSIONS.MELDUNGEN_SUBMIT,
    PERMISSIONS.MELDUNGEN_HANDLE,
    PERMISSIONS.MELDUNGEN_VIEW_ALL,
  ]);
  if (!actorResult.ok) {
    return NextResponse.json(
      { error: actorResult.error },
      { status: actorResult.status, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const inline = request.nextUrl.searchParams.get("disposition") === "inline";

  try {
    const result = await downloadClubMeldungLinkedAttachment({
      tenantId: actorResult.actor.tenantId,
      actorUserId: actorResult.actor.actorUserId,
      permissionKeys: actorResult.actor.permissionKeys,
      clubMeldungAttachmentId,
      disposition: inline ? "inline" : "attachment",
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    return new Response(result.stream, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Length": String(result.sizeBytes),
        "Content-Disposition": attachmentDisposition(result.filename, result.inline),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    if (error instanceof CommunicationAttachmentServiceError) {
      const status =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "ATTACHMENT_NOT_FOUND"
            ? 404
            : error.code === "ATTACHMENT_UNAVAILABLE"
              ? 423
              : 400;
      return NextResponse.json(
        { error: error.message },
        { status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
    console.error("Club meldung attachment download failed", error);
    return NextResponse.json(
      { error: "Der Anhang konnte nicht geladen werden." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}