import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { COMMUNICATION_ATTACHMENT_DOWNLOAD_PERMISSIONS } from "@/lib/communication/attachment-upload-permissions";
import { downloadCommunicationAttachment } from "@/lib/communication/attachment-download-service";
import { CommunicationAttachmentServiceError } from "@/lib/communication/attachment-service";

export const runtime = "nodejs";

type Context = { params: Promise<{ attachmentId: string }> };

function attachmentDisposition(filename: string, inline: boolean): string {
  const ascii = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const kind = inline ? "inline" : "attachment";
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function errorResponse(error: unknown) {
  if (error instanceof CommunicationAttachmentServiceError) {
    const status =
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "ATTACHMENT_NOT_FOUND"
          ? 404
          : error.code === "ATTACHMENT_UNAVAILABLE"
            ? 423
            : error.code === "STORAGE_FAILED"
              ? 502
              : 400;
    return NextResponse.json(
      { error: error.message },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  console.error("Communication attachment download failed:", error);
  return NextResponse.json(
    { error: "Der Anhang konnte nicht geladen werden." },
    { status: 500, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function GET(request: NextRequest, context: Context) {
  await requireAnyPermission(COMMUNICATION_ATTACHMENT_DOWNLOAD_PERMISSIONS);
  const tenant = await getActiveTenant();
  const session = await auth();
  const actorUserId =
    session?.user?.effectiveUserId ?? session?.user?.id ?? null;
  if (!tenant || !actorUserId) {
    return NextResponse.json(
      { error: "Nicht authentifiziert." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { attachmentId } = await context.params;
  const inline = request.nextUrl.searchParams.get("disposition") === "inline";

  try {
    const result = await downloadCommunicationAttachment({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      actorUserId,
      attachmentId,
      disposition: inline ? "inline" : "attachment",
    });
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
    return errorResponse(error);
  }
}
