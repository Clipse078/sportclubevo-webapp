import { prisma } from "@/lib/db/prisma";

export {
  WORKSPACE_VERSION_UPLOADER_UNAVAILABLE,
  toWorkspaceVersionUploaderPublicDto,
  type WorkspaceVersionUploaderPublicDto,
} from "@/lib/workspace/version/version-uploader-public-dto";

export function formatWorkspacePersonDisplayName(input: {
  displayName: string | null;
  firstName: string;
  lastName: string;
}): string | null {
  const fromDisplay = input.displayName?.trim();
  if (fromDisplay) {
    return fromDisplay;
  }

  const combined = `${input.firstName} ${input.lastName}`.trim();
  return combined.length > 0 ? combined : null;
}

function formatWorkspaceUserDisplayName(input: {
  firstName: string;
  lastName: string;
}): string | null {
  const combined = `${input.firstName} ${input.lastName}`.trim();
  return combined.length > 0 ? combined : null;
}

/**
 * Resolves immutable version `createdByUserId` values to tenant-safe display names.
 *
 * Prefer same-tenant Person profile labels; fall back to active tenant membership +
 * User name only when no Person link exists. Never returns email or technical ids.
 */
export async function resolveWorkspaceVersionUploaderDisplayNames(
  tenantId: string,
  userIds: readonly string[],
): Promise<Map<string, string>> {
  const uniqueUserIds = [
    ...new Set(
      userIds
        .map((userId) => userId.trim())
        .filter((userId) => userId.length > 0),
    ),
  ];

  const displayNames = new Map<string, string>();
  if (uniqueUserIds.length === 0) {
    return displayNames;
  }

  const linkedPersons = await prisma.person.findMany({
    where: {
      tenantId,
      userId: { in: uniqueUserIds },
    },
    select: {
      userId: true,
      displayName: true,
      firstName: true,
      lastName: true,
    },
  });

  for (const person of linkedPersons) {
    if (!person.userId) {
      continue;
    }

    const displayName = formatWorkspacePersonDisplayName(person);
    if (displayName) {
      displayNames.set(person.userId, displayName);
    }
  }

  const unresolvedUserIds = uniqueUserIds.filter(
    (userId) => !displayNames.has(userId),
  );

  if (unresolvedUserIds.length === 0) {
    return displayNames;
  }

  const activeMemberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId,
      userId: { in: unresolvedUserIds },
      isActive: true,
    },
    select: { userId: true },
  });

  const tenantMemberUserIds = new Set(
    activeMemberships.map((membership) => membership.userId),
  );

  if (tenantMemberUserIds.size === 0) {
    return displayNames;
  }

  const tenantMemberUsers = await prisma.user.findMany({
    where: {
      id: { in: [...tenantMemberUserIds] },
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  for (const user of tenantMemberUsers) {
    const displayName = formatWorkspaceUserDisplayName(user);
    if (displayName) {
      displayNames.set(user.id, displayName);
    }
  }

  return displayNames;
}
