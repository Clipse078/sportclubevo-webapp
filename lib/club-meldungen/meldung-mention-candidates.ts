/**
 * SCE-ANLIEGEN-02 — bounded mention candidate search (internal-view-filtered).
 */

import { prisma } from "@/lib/db/prisma";
import {
  MELDUNG_MENTION_SEARCH_LIMIT,
  MELDUNG_MENTION_SEARCH_MAX_DB_ROWS,
  MELDUNG_MENTION_SEARCH_MIN_CHARS,
} from "./constants";
import {
  filterUserIdsWhoCanViewMeldungInternal,
  loadMeldungMentionAccessRecord,
  type MeldungMentionAccessRecord,
} from "./meldung-mention-auth";
import { searchEligiblePersonUserIdentitiesInTenant } from "@/lib/people/person-user-identity";
import { meldungMentionDisplayName } from "./meldung-mention-tokens";

export type MeldungMentionCandidate = {
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
};

function userSearchWhere(term: string) {
  if (term.length > 0 && term.length < MELDUNG_MENTION_SEARCH_MIN_CHARS) {
    return null;
  }
  if (!term) return {};
  return {
    OR: [
      { firstName: { contains: term, mode: "insensitive" as const } },
      { lastName: { contains: term, mode: "insensitive" as const } },
    ],
  };
}

function mapRows(
  rows: Array<{
    user: { id: string; firstName: string; lastName: string; isActive: boolean };
  }>,
  personNameByUserId: Map<string, { firstName: string; lastName: string }>,
): MeldungMentionCandidate[] {
  return rows
    .map((m) => m.user)
    .filter((u) => u.isActive)
    .map((u) => {
      const personName = personNameByUserId.get(u.id);
      const firstName = personName?.firstName ?? u.firstName;
      const lastName = personName?.lastName ?? u.lastName;
      return {
        userId: u.id,
        firstName,
        lastName,
        displayName: meldungMentionDisplayName(firstName, lastName),
      };
    });
}

async function loadLinkedPersonNamesForUsers(
  tenantId: string,
  userIds: string[],
): Promise<Map<string, { firstName: string; lastName: string }>> {
  if (userIds.length === 0) return new Map();
  const people = await prisma.person.findMany({
    where: {
      tenantId,
      isActive: true,
      userId: { in: userIds },
    },
    select: { userId: true, firstName: true, lastName: true },
  });
  return new Map(
    people
      .filter((row): row is typeof row & { userId: string } => row.userId != null)
      .map((row) => [row.userId, { firstName: row.firstName, lastName: row.lastName }]),
  );
}

export async function searchMeldungMentionCandidates(input: {
  tenantId: string;
  meldungId: string;
  actorUserId: string;
  search: string;
  limit?: number;
}): Promise<MeldungMentionCandidate[]> {
  const term = input.search.trim();
  const userFilter = userSearchWhere(term);
  if (userFilter === null) return [];

  const record = await loadMeldungMentionAccessRecord(input.tenantId, input.meldungId);
  if (!record) return [];

  const personMatches =
    term.length > 0
      ? await searchEligiblePersonUserIdentitiesInTenant(
          input.tenantId,
          term,
          MELDUNG_MENTION_SEARCH_LIMIT * 4,
        )
      : [];
  const personMatchedUserIds = personMatches.map((row) => row.userId);

  const max = input.limit ?? MELDUNG_MENTION_SEARCH_LIMIT;
  const batchSize = Math.max(max * 3, max);
  let skip = 0;
  const results: MeldungMentionCandidate[] = [];
  const seen = new Set<string>();

  const activeUserWhere =
    term.length > 0
      ? {
          isActive: true,
          OR: [
            ...(userFilter.OR ?? []),
            ...(personMatchedUserIds.length > 0
              ? [{ id: { in: personMatchedUserIds } }]
              : []),
          ],
        }
      : { isActive: true, ...userFilter };

  while (results.length < max && skip < MELDUNG_MENTION_SEARCH_MAX_DB_ROWS) {
    const take = Math.min(batchSize, MELDUNG_MENTION_SEARCH_MAX_DB_ROWS - skip);
    const memberships = await prisma.tenantMembership.findMany({
      where: {
        tenantId: input.tenantId,
        isActive: true,
        userId: { not: input.actorUserId },
        user: activeUserWhere,
      },
      select: {
        user: { select: { id: true, firstName: true, lastName: true, isActive: true } },
      },
      orderBy: { user: { lastName: "asc" } },
      take,
      skip,
    });

    skip += memberships.length;
    if (memberships.length === 0) break;

    const userIds = memberships.map((row) => row.user.id);
    const personNameByUserId = await loadLinkedPersonNamesForUsers(input.tenantId, userIds);
    const options = mapRows(memberships, personNameByUserId).filter((row) => !seen.has(row.userId));
    for (const row of options) {
      seen.add(row.userId);
    }
    if (options.length === 0) continue;

    const readableIds = await filterUserIdsWhoCanViewMeldungInternal(
      input.tenantId,
      record,
      options.map((o) => o.userId),
    );
    const readable = new Set(readableIds);

    for (const option of options) {
      if (readable.has(option.userId)) {
        results.push(option);
        if (results.length >= max) break;
      }
    }
  }

  return results.slice(0, max);
}

/** Used in tests — documents eligibility split. */
export function meldungMentionSearchWorstCaseDbRowBound(): number {
  return MELDUNG_MENTION_SEARCH_MAX_DB_ROWS;
}

export type { MeldungMentionAccessRecord };