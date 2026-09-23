/**
 * GET /api/workspace/documents/[documentId]/preview
 *
 * Returns a tenant-scoped Workspace document for inline browser display.
 *
 * Differences from the /download route:
 *   - Content-Disposition is always "inline" — the browser renders in place.
 *   - Only image/* and application/pdf are served inline; other types are
 *     redirected to the /download endpoint.
 *
 * Permission: WORKSPACE_VIEW
 */

export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import { assertWorkspaceDocumentReadWithOptionalBreakGlass } from "@/lib/workspace/governance/workspace-governance-read-authorization";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import {
  getWorkspaceDocumentVersionForDownload,
  WorkspaceDocumentVersionAccessError,
} from "@/lib/workspace/document-version-access-service";
import { isWorkspaceInlinePreviewSupported } from "@/lib/workspace/storage/preview-policy";
import {
  assertWorkspaceVersionSafeForDelivery,
  WorkspaceContentDeliveryBlockedError,
} from "@/lib/workspace/malware-scan/content-delivery-gate";
import { prisma } from "@/lib/db/prisma";
import { getWorkspaceStorageProvider } from "@/lib/workspace/upload-storage";
import { resolveWorkspaceVersionIdQuery } from "@/lib/workspace/version/version-query";

function safeFilename(raw: string): string {
  return raw.replace(/[^\w.\-]/g, "_").slice(0, 200);
}

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
      { error: access.error },
      { status: access.status },
    );
  }

  const sessionTenantId = access.tenantId;

  const tenant = await getTenantFromSession(sessionTenantId);

  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant nicht gefunden." },
      { status: 404 },
    );
  }

  const { documentId } = await params;
  const versionQuery = resolveWorkspaceVersionIdQuery(
    new URL(request.url).searchParams,
  );

  if (versionQuery.mode === "invalid") {
    return NextResponse.json(
      { error: "Dokument nicht gefunden." },
      { status: 404 },
    );
  }

  const versionId =
    versionQuery.mode === "historical" ? versionQuery.versionId : null;

  try {
    await assertWorkspaceDocumentReadWithOptionalBreakGlass({
      actor: access.actor,
      documentId,
      operation: "PREVIEW",
      breakGlass: "allowed",
    });
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
    let document;

    try {
      document = await getWorkspaceDocumentVersionForDownload({
        tenantId: tenant.id,
        actorUserId: access.actorUserId,
        documentId,
        versionId,
      });
    } catch (error) {
      if (error instanceof WorkspaceDocumentVersionAccessError) {
        return NextResponse.json(
          { error: "Dokument nicht gefunden." },
          { status: 404 },
        );
      }
      throw error;
    }

    if (!document) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden." },
        { status: 404 },
      );
    }

    try {
      await assertWorkspaceVersionSafeForDelivery(prisma, {
        tenantId: tenant.id,
        workspaceDocumentVersionId: document.versionId,
        documentId: document.documentId,
        operation: "PREVIEW",
        actorUserId: access.actorUserId,
      });
    } catch (error) {
      if (error instanceof WorkspaceContentDeliveryBlockedError) {
        return NextResponse.json(
          { error: "Vorschau ist derzeit nicht verfügbar." },
          { status: 403 },
        );
      }
      throw error;
    }

    if (!isWorkspaceInlinePreviewSupported(document.mimeType)) {
      const downloadUrl = versionId
        ? `/api/workspace/documents/${encodeURIComponent(documentId)}/download?versionId=${encodeURIComponent(versionId)}`
        : `/api/workspace/documents/${encodeURIComponent(documentId)}/download`;
      return NextResponse.redirect(
        new URL(downloadUrl, request.url),
      );
    }

    const versionStorageProvider = getWorkspaceStorageProvider(
      document.storageProvider,
    );

    const downloadResult = await versionStorageProvider.download({
      storageReference: document.storageKey,
      filename: document.filename,
      mimeType: document.mimeType,
    });

    if (!downloadResult.ok) {
      return NextResponse.json(
        { error: downloadResult.error },
        { status: downloadResult.status },
      );
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${safeFilename(document.filename)}"`,
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

    return new Response(downloadResult.stream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(
      "[workspace-preview] document preview failed",
      error,
    );

    return NextResponse.json(
      { error: "Vorschau konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
