import { PERSON_FUNCTION_OPTIONS } from "@/lib/people/functions";
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

function toItem(option: { value: string; label: string }): SceSelectorItem {
  return {
    id: option.value,
    type: "ROLE",
    label: option.label,
    description: "Rolle/Funktion",
    metadata: { roleFunctionKey: option.value, workspaceRoleFunction: true },
  };
}

export async function browseWorkspaceRoleFunctionSelectorItems(input: {
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const slice = PERSON_FUNCTION_OPTIONS.slice(offset, offset + limit + 1);
  return sceSelectorPageFromFetched(slice.map(toItem), limit, offset);
}

export async function searchWorkspaceRoleFunctionSelectorItems(input: {
  query: string;
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const term = input.query.trim();
  if (term.length < SCE_SELECTOR_MIN_SEARCH_LENGTH) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_SEARCH_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const normalized = term.toLowerCase();
  const filtered = PERSON_FUNCTION_OPTIONS.filter(
    (option) =>
      option.label.toLowerCase().includes(normalized) ||
      option.value.toLowerCase().includes(normalized),
  );
  const slice = filtered.slice(offset, offset + limit + 1);
  return sceSelectorPageFromFetched(slice.map(toItem), limit, offset);
}
