import { WorkspaceAccessInheritanceMode } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  nestedResourceInheritPolicy,
  rootFolderPolicyCreateInput,
} from "@/lib/workspace/access/policy-persistence";
import {
  type CreateWorkspaceFolderInput,
  type ListWorkspaceFoldersInput,
  type WorkspaceFolderRecord,
} from "@/lib/workspace/folder-dto";

export type WorkspaceFolderServiceErrorCode =
  | "INVALID_INPUT"
  | "PARENT_FOLDER_NOT_FOUND"
  | "WORKSPACE_FOLDER_NAME_CONFLICT";

export class WorkspaceFolderServiceError extends Error {
  constructor(
    public readonly code: WorkspaceFolderServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceFolderServiceError";
  }
}

/**
 * Normalises a workspace folder name for duplicate detection.
 * Trims surrounding whitespace and folds to locale-independent lowercase.
 * Use this before any case-insensitive sibling-name comparison.
 */
export function normalizeWorkspaceFolderName(
  name: string,
): string {
  return name.trim().toLowerCase();
}

function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WorkspaceFolderServiceError(
      "INVALID_INPUT",
      `${fieldName} ist erforderlich.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function normalizeOptionalId(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function normalizeDisplayOrder(
  value: number | undefined,
): number {
  if (value == null) {
    return 0;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new WorkspaceFolderServiceError(
      "INVALID_INPUT",
      "displayOrder muss eine nichtnegative Ganzzahl sein.",
    );
  }

  return value;
}

async function assertParentFolderExists(
  tenantId: string,
  parentId: string | null,
): Promise<void> {
  if (!parentId) {
    return;
  }

  const parent = await prisma.workspaceFolder.findFirst({
    where: {
      id: parentId,
      tenantId,
      archivedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!parent) {
    throw new WorkspaceFolderServiceError(
      "PARENT_FOLDER_NOT_FOUND",
      "Übergeordneter Workspace-Ordner wurde nicht gefunden.",
    );
  }
}

/**
 * Checks that no active sibling folder in the same parent scope has the
 * same name after normalisation (trimmed, case-insensitive).
 * Optionally excludes a folder ID to support rename/move without
 * self-collision.
 */
async function assertFolderNameAvailable(input: {
  tenantId: string;
  parentId: string | null;
  name: string;
  excludeFolderId?: string;
}): Promise<void> {
  const duplicate = await prisma.workspaceFolder.findFirst({
    where: {
      tenantId: input.tenantId,
      parentId: input.parentId,
      archivedAt: null,
      ...(input.excludeFolderId
        ? { id: { not: input.excludeFolderId } }
        : {}),
      name: {
        equals: input.name,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    throw new WorkspaceFolderServiceError(
      "WORKSPACE_FOLDER_NAME_CONFLICT",
      "In diesem Ordner existiert bereits ein Ordner mit diesem Namen.",
    );
  }
}

export async function listWorkspaceFolders(
  input: ListWorkspaceFoldersInput,
): Promise<WorkspaceFolderRecord[]> {
  const tenantId = normalizeRequiredText(
    input.tenantId,
    "tenantId",
  );

  const parentId = normalizeOptionalId(input.parentId);

  if (parentId) {
    await assertParentFolderExists(
      tenantId,
      parentId,
    );
  }

  const authorizedIds = input.authorizedFolderIds;
  const idFilter =
    authorizedIds.length === 0
      ? { in: ["__workspace_unauthorized__"] as string[] }
      : { in: [...authorizedIds] };

  return prisma.workspaceFolder.findMany({
    where: {
      tenantId,
      parentId,
      archivedAt: null,
      id: idFilter,
    },
    orderBy: [
      {
        displayOrder: "asc",
      },
      {
        name: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    select: {
      id: true,
      parentId: true,
      name: true,
      description: true,
      displayOrder: true,
      createdByUserId: true,
      updatedByUserId: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createWorkspaceFolder(
  input: CreateWorkspaceFolderInput,
): Promise<WorkspaceFolderRecord> {
  const tenantId = normalizeRequiredText(
    input.tenantId,
    "tenantId",
  );

  const actorUserId = normalizeRequiredText(
    input.actorUserId,
    "actorUserId",
  );

  const parentId = normalizeOptionalId(input.parentId);
  const name = normalizeRequiredText(input.name, "name");
  const description = normalizeOptionalText(
    input.description,
  );
  const displayOrder = normalizeDisplayOrder(
    input.displayOrder,
  );

  await assertParentFolderExists(
    tenantId,
    parentId,
  );

  await assertFolderNameAvailable({
    tenantId,
    parentId,
    name,
  });

  const creatorPerson = await prisma.person.findFirst({
    where: { tenantId, userId: actorUserId },
    select: { id: true },
  });

  const isRoot = parentId == null;

  return prisma.$transaction(async (transaction) => {
    const folder = await transaction.workspaceFolder.create({
      data: {
        tenantId,
        parentId,
        name,
        description,
        displayOrder,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        accessInheritanceMode: isRoot
          ? WorkspaceAccessInheritanceMode.EXPLICIT
          : nestedResourceInheritPolicy().accessInheritanceMode,
      },
      select: {
        id: true,
        parentId: true,
        name: true,
        description: true,
        displayOrder: true,
        createdByUserId: true,
        updatedByUserId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (isRoot) {
      const policy = rootFolderPolicyCreateInput({
        tenantId,
        folderId: folder.id,
        creatorPersonId: creatorPerson?.id ?? null,
      });
      await transaction.workspaceAccessGrant.createMany({
        data: policy.accessGrants.create.map((grant) => ({
          tenantId: grant.tenantId,
          resourceType: grant.resourceType,
          folderId: folder.id,
          documentId: null,
          subjectType: grant.subjectType,
          accessLevel: grant.accessLevel,
          personId: grant.personId ?? null,
          orgUnitId: grant.orgUnitId ?? null,
          teamId: grant.teamId ?? null,
          roleFunctionKey: grant.roleFunctionKey ?? null,
          roleScopeOrgUnitId: grant.roleScopeOrgUnitId ?? null,
          roleScopeTeamId: grant.roleScopeTeamId ?? null,
        })),
      });
    }

    return folder;
  });
}
