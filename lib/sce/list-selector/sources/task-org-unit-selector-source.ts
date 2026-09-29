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
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { loadTaskOrgUnitMutationOptions } from "@/lib/tasks/task-org-options";

function formatOrgUnitLabel(option: { label: string; level: number }): string {
  const indent = option.level > 0 ? `${" ".repeat(option.level * 2)}↳ ` : "";
  return `${indent}${option.label}`;
}

function toItem(option: { id: string; label: string; level: number }): SceSelectorItem {
  return {
    id: option.id,
    type: "ORG_UNIT",
    label: option.label,
    description: option.level > 0 ? "Organisationseinheit" : "Organisationseinheit",
    metadata: { level: option.level },
  };
}

async function loadAuthorizedOptions(tenantId: string, actorUserId: string) {
  const ctx = await buildTaskServiceContextForActor(actorUserId, tenantId);
  if (!ctx) return [];
  return loadTaskOrgUnitMutationOptions(ctx);
}

export async function browseTaskOrgUnitSelectorItems(input: {
  tenantId: string;
  actorUserId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const options = await loadAuthorizedOptions(input.tenantId, input.actorUserId);
  const slice = options.slice(offset, offset + limit + 1);
  return sceSelectorPageFromFetched(
    slice.map((option) => toItem(option)),
    limit,
    offset,
  );
}

export async function searchTaskOrgUnitSelectorItems(input: {
  tenantId: string;
  actorUserId: string;
  query: string;
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const term = input.query.trim().toLowerCase();
  if (term.length < SCE_SELECTOR_MIN_SEARCH_LENGTH) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_SEARCH_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const options = await loadAuthorizedOptions(input.tenantId, input.actorUserId);
  const filtered = options.filter((option) =>
    formatOrgUnitLabel(option).toLowerCase().includes(term),
  );
  const slice = filtered.slice(offset, offset + limit + 1);
  return sceSelectorPageFromFetched(
    slice.map((option) => toItem(option)),
    limit,
    offset,
  );
}
