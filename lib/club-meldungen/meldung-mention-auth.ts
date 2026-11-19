/**
 * SCE-ANLIEGEN-02 — mention eligibility via canViewMeldungInternal (never grants access).
 */

import { prisma } from "@/lib/db/prisma";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { canViewMeldungInternal, type ClubMeldungAccessContext } from "./access";
import { ClubMeldungServiceError } from "./meldung-service";
import { MAX_CLUB_MELDUNG_MESSAGE_MENTIONS } from "./constants";
import {
  filterMentionedUserIdsPresentInBody,
  meldungMentionDisplayName,
} from "./meldung-mention-tokens";

export type MeldungMentionAccessRecord = {
  accountableUserId: string | null;
  reporterUserId: string;
  collaboratorUserIds: string[];
};

export async function loadMeldungMentionAccessRecord(
  tenantId: string,
  meldungId: string,
): Promise<MeldungMentionAccessRecord | null> {
  const row = await prisma.clubMeldung.findFirst({
    where: { id: meldungId, tenantId },
    select: {
      accountableUserId: true,
      reporterUserId: true,
      collaborators: { select: { userId: true } },
    },
  });
  if (!row) return null;
  return {
    accountableUserId: row.accountableUserId,
    reporterUserId: row.reporterUserId,
    collaboratorUserIds: row.collaborators.map((c) => c.userId),
  };
}

async function permissionKeysForUser(tenantId: string, userId: string): Promise<string[]> {
  const resolver = createEffectivePermissionResolver(prisma);
  const perms = await resolver.getEffectivePermissions({ userId, tenantId });
  return [...perms.platform, ...perms.tenant];
}

export function userCanViewMeldungInternal(
  record: MeldungMentionAccessRecord,
  ctx: ClubMeldungAccessContext,
): boolean {
  return canViewMeldungInternal(record, ctx);
}

export async function canUserViewMeldungInternalNow(
  tenantId: string,
  userId: string,
  record: MeldungMentionAccessRecord,
): Promise<boolean> {
  const permissionKeys = await permissionKeysForUser(tenantId, userId);
  return userCanViewMeldungInternal(record, {
    actorUserId: userId,
    permissionKeys,
    collaboratorUserIds: record.collaboratorUserIds,
  });
}

export function normalizeMentionedUserIds(raw: string[] | undefined): string[] {
  const unique = [...new Set((raw ?? []).map((id) => id.trim()).filter(Boolean))];
  if (unique.length > MAX_CLUB_MELDUNG_MESSAGE_MENTIONS) {
    throw new ClubMeldungServiceError(
      `Es können höchstens ${MAX_CLUB_MELDUNG_MESSAGE_MENTIONS} Erwähnungen pro Kommentar gesetzt werden.`,
      "VALIDATION",
    );
  }
  return unique;
}

export async function validateMentionedUsersForMeldung(input: {
  tenantId: string;
  meldungId: string;
  body: string;
  mentionedUserIds: string[];
}): Promise<string[]> {
  const normalized = normalizeMentionedUserIds(input.mentionedUserIds);
  if (normalized.length === 0) return [];

  const record = await loadMeldungMentionAccessRecord(input.tenantId, input.meldungId);
  if (!record) {
    throw new ClubMeldungServiceError("Meldung nicht gefunden", "NOT_FOUND");
  }

  const memberships = await prisma.tenantMembership.findMany({
    where: {
      tenantId: input.tenantId,
      isActive: true,
      userId: { in: normalized },
      tenant: { status: "ACTIVE" },
      user: { isActive: true },
    },
    select: {
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const byUserId = new Map(memberships.map((m) => [m.userId, m.user]));
  const missingMembership = normalized.filter((id) => !byUserId.has(id));
  if (missingMembership.length > 0) {
    throw new ClubMeldungServiceError(
      "Erwähnte Benutzer sind für diese Meldung nicht berechtigt.",
      "FORBIDDEN",
    );
  }

  const withTokens = filterMentionedUserIdsPresentInBody(
    input.body,
    normalized
      .map((id) => {
        const user = byUserId.get(id);
        return user
          ? { userId: user.id, firstName: user.firstName, lastName: user.lastName }
          : null;
      })
      .filter((row): row is { userId: string; firstName: string; lastName: string } => row != null),
  );

  if (withTokens.length === 0) return [];

  const eligible: string[] = [];
  for (const userId of withTokens) {
    if (await canUserViewMeldungInternalNow(input.tenantId, userId, record)) {
      eligible.push(userId);
    } else {
      throw new ClubMeldungServiceError(
        "Erwähnte Benutzer sind für diese Meldung nicht berechtigt.",
        "FORBIDDEN",
      );
    }
  }

  return eligible;
}

export async function filterUserIdsWhoCanViewMeldungInternal(
  tenantId: string,
  record: MeldungMentionAccessRecord,
  userIds: readonly string[],
): Promise<string[]> {
  const eligible: string[] = [];
  for (const userId of userIds) {
    if (await canUserViewMeldungInternalNow(tenantId, userId, record)) {
      eligible.push(userId);
    }
  }
  return eligible;
}

export async function resolveMentionDisplayNames(
  tenantId: string,
  userIds: string[],
): Promise<Array<{ userId: string; displayName: string }>> {
  if (userIds.length === 0) return [];
  const rows = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      tenantMemberships: { some: { tenantId, isActive: true } },
    },
    select: { id: true, firstName: true, lastName: true },
  });
  return rows.map((row) => ({
    userId: row.id,
    displayName: meldungMentionDisplayName(row.firstName, row.lastName),
  }));
}