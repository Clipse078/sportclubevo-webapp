import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import { assertWorkspaceDocumentView } from "@/lib/workspace/workspace-resource-guards";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import {
  getDocumentVersions,
  WorkspaceDocumentVersionServiceError,
} from "@/lib/workspace/document-version-service";

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
        versions,
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