export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import { assertWorkspaceDocumentView } from "@/lib/workspace/workspace-resource-guards";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import {
  downloadWorkspaceDocument,
  WorkspaceDocumentDownloadServiceError,
} from "@/lib/workspace/document-download-service";
import { getWorkspaceAttachmentContentDisposition } from "@/lib/workspace/upload-types";
import { resolveWorkspaceVersionIdQuery } from "@/lib/workspace/version/version-query";

type Params = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: Params,
) {
  const access = await requireWorkspaceApiActor(
    PERMISSIONS.WORKSPACE_VIEW,
  );

  if (!access.ok) {
    return NextResponse.json(
      {
        error: access.error,
      },
      {
        status: access.status,
      },
    );
  }

  const sessionTenantId = access.tenantId;

  const tenant = await getTenantFromSession(sessionTenantId);

  if (!tenant) {
    return NextResponse.json(
      {
        error: "Tenant nicht gefunden.",
      },
      {
        status: 404,
      },
    );
  }

  const { documentId } = await params;
  const versionQuery = resolveWorkspaceVersionIdQuery(
    new URL(request.url).searchParams,
  );

  if (versionQuery.mode === "invalid") {
    return NextResponse.json(
      {
        error: "Dokument nicht gefunden.",
        code: "DOCUMENT_NOT_FOUND",
      },
      { status: 404 },
    );
  }

  const versionId =
    versionQuery.mode === "historical" ? versionQuery.versionId : null;

  try {
    assertWorkspaceDocumentView(access.actor, documentId);
  } catch (error) {
    if (error instanceof WorkspaceAuthorizationError) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden." },
        { status: 404 },
      );
    }
    throw error;
  }

  try {
    const downloadResult = await downloadWorkspaceDocument({
      tenantId: tenant.id,
      actorUserId: access.actorUserId,
      documentId,
      versionId,
    });

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": getWorkspaceAttachmentContentDisposition(
        downloadResult.filename,
      ),
      "Content-Type": downloadResult.contentType,
      "X-Content-Type-Options": "nosniff",
    });

    if (
      Number.isSafeInteger(downloadResult.sizeBytes) &&
      downloadResult.sizeBytes >= 0
    ) {
      headers.set(
        "Content-Length",
        String(downloadResult.sizeBytes),
      );
    }

    if (downloadResult.etag) {
      headers.set("ETag", downloadResult.etag);
    }

    return new Response(downloadResult.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    if (error instanceof WorkspaceDocumentDownloadServiceError) {
      const status =
        error.code === "DOCUMENT_NOT_FOUND" ||
        error.code === "BLOB_NOT_FOUND"
          ? 404
          : 400;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        {
          status,
        },
      );
    }

    console.error(
      "[workspace-documents] document download failed",
      error,
    );

    return NextResponse.json(
      {
        error: "Das Dokument konnte nicht heruntergeladen werden.",
      },
      {
        status: 500,
      },
    );
  }
}
