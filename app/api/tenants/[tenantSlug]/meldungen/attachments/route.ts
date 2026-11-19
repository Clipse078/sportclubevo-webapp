import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  createUploadedAttachment,
  CommunicationAttachmentServiceError,
} from "@/lib/communication/attachment-service";
import {
  CommunicationAttachmentValidationError,
  MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
} from "@/lib/communication/attachment-validation";
import { requireMeldungApiActor } from "@/lib/club-meldungen/tenant-api";
import { meldungApiSchemaGuard } from "@/lib/club-meldungen/api-schema";

export const runtime = "nodejs";

type Context = { params: Promise<{ tenantSlug: string }> };

function errorResponse(error: unknown) {
  if (error instanceof CommunicationAttachmentValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "FILE_TOO_LARGE" ? 413 : 400 },
    );
  }
  if (error instanceof CommunicationAttachmentServiceError) {
    const status =
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "STORAGE_FAILED" || error.code === "PERSISTENCE_FAILED"
          ? 502
          : 400;
    return NextResponse.json({ error: error.message }, { status });
  }
  console.error("Club meldung attachment upload failed:", error);
  return NextResponse.json({ error: "Die Datei konnte nicht gespeichert werden." }, { status: 500 });
}

export async function POST(request: NextRequest, context: Context) {
  const schemaBlocked = await meldungApiSchemaGuard();
  if (schemaBlocked) return schemaBlocked;

  const { tenantSlug } = await context.params;
  const actorResult = await requireMeldungApiActor(tenantSlug, [
    PERMISSIONS.MELDUNGEN_SUBMIT,
    PERMISSIONS.MELDUNGEN_HANDLE,
  ]);
  if (!actorResult.ok) {
    return NextResponse.json({ error: actorResult.error }, { status: actorResult.status });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("file");
    if (files.length !== 1 || !(files[0] instanceof File)) {
      return NextResponse.json({ error: "Bitte genau eine Datei auswählen." }, { status: 400 });
    }
    const file = files[0];
    if (file.size > MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES) {
      return NextResponse.json({ error: "Die Datei überschreitet 10 MiB." }, { status: 413 });
    }

    const attachment = await createUploadedAttachment({
      tenantId: actorResult.actor.tenantId,
      actorUserId: actorResult.actor.actorUserId,
      filename: file.name,
      declaredContentType: file.type,
      buffer: new Uint8Array(await file.arrayBuffer()),
      ingestionMetadata: { source: "CLUB_MELDUNG_REPORTER" },
    });

    return NextResponse.json(
      {
        attachment: {
          attachmentId: attachment.id,
          filename: attachment.sanitizedFilename,
          contentType: attachment.contentType,
          size: attachment.sizeBytes,
          status: attachment.lifecycleStatus,
          scanStatus: attachment.scanStatus,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}