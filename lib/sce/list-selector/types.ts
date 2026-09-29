/**
 * SCE-SELECTOR-01 — canonical list selector contracts (domain-agnostic).
 */

export const SCE_SELECTOR_SOURCE_TYPES = [
  "PERSON",
  "TEAM",
  "ORG_UNIT",
  "ROLE",
  "TARGET_GROUP",
  "EXTERNAL_CONTACT",
] as const;

export type SceSelectorSourceType = (typeof SCE_SELECTOR_SOURCE_TYPES)[number];

export type SceSelectorCategory = "all" | Lowercase<SceSelectorSourceType>;

export type SceSelectorItem = {
  id: string;
  type: SceSelectorSourceType;
  label: string;
  description?: string | null;
  searchText?: string | null;
  disabled?: boolean;
  disabledReason?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type SceSelectorResultGroup = {
  type: SceSelectorSourceType;
  heading: string;
  items: SceSelectorItem[];
  hasMore?: boolean;
  nextCursor?: string | null;
};

export type SceSelectorDiscoverResponse = {
  groups: SceSelectorResultGroup[];
  noAccess?: boolean;
  error?: string;
};

export type SceSelectorSelectionMode = "single" | "multiple";

export type SceSelectorPick = {
  type: SceSelectorSourceType;
  id: string;
  label: string;
};

export function sceSelectorPickKey(type: SceSelectorSourceType, id: string): string {
  return `${type}:${id}`;
}

export type SceSelectorQueryInput = {
  tenantId: string;
  actorUserId: string;
  enabledTypes: readonly SceSelectorSourceType[];
  category: SceSelectorCategory;
  query: string;
  limitPerGroup?: number;
  /** Communication-specific; ignored by generic club selectors. */
  communicationContext?: "DIRECT" | "ORGANISATION";
};
