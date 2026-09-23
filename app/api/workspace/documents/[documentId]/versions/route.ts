export const runtime = "nodejs";

import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import { assertWorkspaceDocumentEdit } from "@/lib/workspace/workspace-resource-guards";
import { assertWorkspaceDocumentReadWithOptionalBreakGlass } from "@/lib/workspace/governance/workspace-governance-read-authorization";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import { serializeWorkspaceDocumentVersionHistoryPublicItem } from "@/lib/workspace/document-version-history-public-dto";
import {
  getDocumentVersions,
  WorkspaceDocumentVersionServiceError,
} from "@/lib/workspace/document-version-service";
import {
  appendWorkspaceDocumentVersion,
  WorkspaceDocumentVersionWriteError,
} from "@/lib/workspace/document-version-write-service";
import {
  getConfiguredWorkspaceUploadStorageProvider,
  getConfiguredWorkspaceUploadStorageProviderId,
} from "@/lib/workspace/upload-storage";
import { validateWorkspaceUploadFile } from "@/lib/workspace/upload-types";
import {
  TeamDocumentValidationError,
  validateWorkspaceDocumentUpload,
} from "@/lib/workspace/storage/upload-policy";

type Params = {
  params: Promise<{
    documentId: string;
  }>;
};

export async function GET(
  _request: Request,
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
  const actorUserId = access.actorUserId;

  const tenant = await getTenantFromSession(
    sessionTenantId,
  );

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

  try {
    await assertWorkspaceDocumentReadWithOptionalBreakGlass({
      actor: access.actor,
      documentId,
      operation: "VERSION_HISTORY",
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
    const versions = await getDocumentVersions({
      tenantId: tenant.id,
      actorUserId,
      documentId,
    });

    if (!versions) {
      return NextResponse.json(
        {
          error: "Dokument nicht gefunden.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        versions: versions.map(serializeWorkspaceDocumentVersionHistoryPublicItem),
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    if (
      error instanceof
      WorkspaceDocumentVersionServiceError
    ) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        {
          status: 400,
        },
      );
    }

    console.error(
      "[workspace-documents] version history failed",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Der Versionsverlauf konnte nicht geladen werden.",
      },
      {
        status: 500,
      },
    );
  }
}

function getOptionalFormText(
  formData: FormData,
  key: string,
): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapVersionWriteError(
  error: WorkspaceDocumentVersionWriteError,
): number {
  switch (error.code) {
    case "INVALID_INPUT":
      return 400;
    case "DOCUMENT_NOT_FOUND":
    case "VERSION_NOT_FOUND":
    case "VERSION_NOT_IN_DOCUMENT":
      return 404;
    case "VERSION_CONTENT_UNAVAILABLE":
      return 404;
    case "VERSION_CONFLICT":
      return 409;
    case "STORAGE_FAILURE":
      return 502;
    default:
      return 500;
  }
}

export async function POST(
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

  const tenant = await getTenantFromSession(access.tenantId);

  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant nicht gefunden." },
      { status: 404 },
    );
  }

  const { documentId } = await params;

  try {
    assertWorkspaceDocumentEdit(access.actor, documentId);
  } catch (error) {
    if (error instanceof WorkspaceAuthorizationError) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden.", code: "WORKSPACE_FORBIDDEN" },
        { status: 404 },
      );
    }
    throw error;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Ungültige Anfrage: multipart/form-data erwartet." },
      { status: 400 },
    );
  }

  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { error: "Kein Datei-Feld 'file' gefunden." },
      { status: 400 },
    );
  }

  const validation = validateWorkspaceUploadFile(fileEntry);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const changeNote = getOptionalFormText(formData, "changeNote");
  const versionId = randomUUID().replaceAll("-", "");

  const arrayBuffer = await fileEntry.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  try {
    await validateWorkspaceDocumentUpload({
      filename: fileEntry.name,
      declaredContentType: fileEntry.type,
      buffer,
    });
  } catch (error) {
    if (error instanceof TeamDocumentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const uploadStorageProvider = getConfiguredWorkspaceUploadStorageProvider();

  const uploadResult = await uploadStorageProvider.upload({
    tenantId: tenant.id,
    documentId,
    versionId,
    filename: validation.filename,
    mimeType: validation.mimeType,
    buffer,
  });

  if (!uploadResult.ok) {
    const body: { error: string; code?: string } = {
      error: uploadResult.error,
    };
    if (uploadResult.code !== undefined) {
      body.code = uploadResult.code;
    }
    return NextResponse.json(body, { status: uploadResult.status });
  }

  try {
    const document = await appendWorkspaceDocumentVersion({
      tenantId: tenant.id,
      actorUserId: access.actorUserId,
      documentId,
      versionId,
      filename: uploadResult.filename,
      mimeType: uploadResult.mimeType,
      sizeBytes: uploadResult.sizeBytes,
      storageKey: uploadResult.storageKey,
      storageUrl: uploadResult.storageUrl,
      versionStorageProviderId: getConfiguredWorkspaceUploadStorageProviderId(),
      checksum: uploadResult.checksum,
      changeNote,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    await uploadStorageProvider.delete(uploadResult.storageKey);

    if (error instanceof WorkspaceDocumentVersionWriteError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: mapVersionWriteError(error) },
      );
    }

    console.error(
      "[workspace-documents] version append failed",
      error,
    );

    return NextResponse.json(
      {
        error: "Die neue Version konnte nicht gespeichert werden.",
        code: "WORKSPACE_UPLOAD_PERSISTENCE_FAILED",
      },
      { status: 500 },
    );
  }
}