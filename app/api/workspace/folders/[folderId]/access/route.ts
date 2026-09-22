import { NextRequest, NextResponse } from "next/server";
import { WorkspaceAccessInheritanceMode, WorkspaceResourceType } from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  applyWorkspaceAccessPolicy,
  WorkspaceGrantMutationError,
} from "@/lib/workspace/access/grant-mutation-service";
import {
  loadWorkspaceAccessManagementViewModel,
  WorkspaceAccessManagementError,
} from "@/lib/workspace/access/access-management-service";
import { WorkspaceAccessGrantValidationError } from "@/lib/workspace/access/grant-validation";
import type { WorkspaceGrantFields } from "@/lib/workspace/access/types";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type RouteContext = { params: Promise<{ folderId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { folderId } = await context.params;
  const id = folderId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Ordner-ID fehlt." }, { status: 400 });
  }

  try {
    const viewModel = await loadWorkspaceAccessManagementViewModel({
      actor: access.actor,
      resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: id },
    });
    return NextResponse.json({ accessManagement: viewModel }, { status: 200 });
  } catch (error) {
    if (error instanceof WorkspaceAccessManagementError) {
      const status = error.message.includes("denied") ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error("[workspace-folder-access] GET failed", error);
    return NextResponse.json(
      { error: "Berechtigungen konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}

type AccessPolicyBody = {
  accessInheritanceMode?: WorkspaceAccessInheritanceMode;
  grants?: WorkspaceGrantFields[];
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { folderId } = await context.params;
  const id = folderId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Ordner-ID fehlt." }, { status: 400 });
  }

  let body: AccessPolicyBody;
  try {
    body = (await request.json()) as AccessPolicyBody;
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const mode =
    body.accessInheritanceMode ?? WorkspaceAccessInheritanceMode.EXPLICIT;
  const grants = Array.isArray(body.grants) ? body.grants : [];

  try {
    await applyWorkspaceAccessPolicy({
      actor: access.actor,
      resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: id },
      accessInheritanceMode: mode,
      replaceGrants: grants,
    });

    const viewModel = await loadWorkspaceAccessManagementViewModel({
      actor: access.actor,
      resource: { resourceType: WorkspaceResourceType.FOLDER, folderId: id },
    });

    return NextResponse.json({ accessManagement: viewModel }, { status: 200 });
  } catch (error) {
    if (
      error instanceof WorkspaceGrantMutationError ||
      error instanceof WorkspaceAccessGrantValidationError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof WorkspaceAccessManagementError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[workspace-folder-access] PUT failed", error);
    return NextResponse.json(
      { error: "Berechtigungen konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }
}
