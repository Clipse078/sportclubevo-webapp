import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import {
  createUploadedAttachment,
  CommunicationAttachmentServiceError,
} from "@/lib/communication/attachment-service";
import {
  CommunicationAttachmentValidationError,
  MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES,
} from "@/lib/communication/attachment-validation";
import { COMMUNICATION_ATTACHMENT_UPLOAD_PERMISSIONS } from "@/lib/communication/attachment-upload-permissions";
import { toPublicCommunicationAttachment } from "@/lib/communication/attachment-public-dto";

export const runtime = "nodejs";

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
  console.error("Communication attachment upload failed:", error);
  return NextResponse.json(
    { error: "Die Datei konnte nicht gespeichert werden." },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  await requireAnyPermission(COMMUNICATION_ATTACHMENT_UPLOAD_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const actorUserId =
    session?.user?.effectiveUserId ?? session?.user?.id ?? null;
  if (!tenant || !actorUserId) {
    return NextResponse.json({ error: "Nicht authentifiziert." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("file");
    if (files.length !== 1 || !(files[0] instanceof File)) {
      return NextResponse.json(
        { error: "Bitte genau eine Datei auswählen." },
        { status: 400 },
      );
    }
    const file = files[0];
    if (file.size > MAX_COMMUNICATION_ATTACHMENT_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Die Datei überschreitet 10 MiB." },
        { status: 413 },
      );
    }

    const attachment = await createUploadedAttachment({
      tenantId: tenant.id,
      actorUserId,
      filename: file.name,
      declaredContentType: file.type,
      buffer: new Uint8Array(await file.arrayBuffer()),
      ingestionMetadata: { source: "COMMUNICATION_COMPOSER" },
    });

    return NextResponse.json(
      {
        attachment: toPublicCommunicationAttachment({
          id: attachment.id,
          filename: attachment.sanitizedFilename,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
          lifecycleStatus: attachment.lifecycleStatus,
          scanStatus: attachment.scanStatus,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
