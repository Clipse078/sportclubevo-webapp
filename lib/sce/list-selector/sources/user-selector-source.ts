import type { SceSelectorItem } from "@/lib/sce/list-selector/types";
import {
  SCE_SELECTOR_DEFAULT_BROWSE_LIMIT,
  SCE_SELECTOR_DEFAULT_SEARCH_LIMIT,
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
} from "@/lib/sce/list-selector/sources/constants";
import {
  sceSelectorDecodeOffset,
  sceSelectorPageFromFetched,
  type SceSelectorSourcePage,
} from "@/lib/sce/list-selector/source-pagination";
import {
  listEligibleTaskAssigneePersons,
  searchEligibleTaskAssigneePersons,
} from "@/lib/tasks/eligible-task-assignee-persons";

function toItem(row: {
  userId: string;
  displayName: string;
  email: string;
}): SceSelectorItem {
  return {
    id: row.userId,
    type: "USER",
    label: row.displayName,
    description: row.email?.trim() || null,
  };
}

export async function browseUserSelectorItems(input: {
  tenantId: string;
  actorUserId: string;
  excludeUserIds?: readonly string[];
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const exclude = new Set(input.excludeUserIds ?? []);

  const all = await listEligibleTaskAssigneePersons(input.tenantId);
  const filtered = all.filter((row) => !exclude.has(row.userId));
  const slice = filtered.slice(offset, offset + limit + 1);

  return sceSelectorPageFromFetched(
    slice.map((row) =>
      toItem({
        userId: row.userId,
        displayName: row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
        email: row.email,
      }),
    ),
    limit,
    offset,
  );
}

export async function searchUserSelectorItems(input: {
  tenantId: string;
  actorUserId: string;
  query: string;
  excludeUserIds?: readonly string[];
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const term = input.query.trim();
  if (term.length < SCE_SELECTOR_MIN_SEARCH_LENGTH) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_SEARCH_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const exclude = new Set(input.excludeUserIds ?? []);

  const rows = await searchEligibleTaskAssigneePersons(input.tenantId, term, limit + offset + 5);
  const filtered = rows.filter((row) => !exclude.has(row.userId));
  const slice = filtered.slice(offset, offset + limit + 1);

  return sceSelectorPageFromFetched(
    slice.map((row) =>
      toItem({
        userId: row.userId,
        displayName: row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
        email: row.email,
      }),
    ),
    limit,
    offset,
  );
}
