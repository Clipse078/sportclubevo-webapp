/**
 * SCE-SELECTOR-01 — canonical list selector contracts (domain-agnostic).
 */

export const SCE_SELECTOR_SOURCE_TYPES = [
  "PERSON",
  "USER",
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
  description?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export function sceSelectorPickKey(type: SceSelectorSourceType, id: string): string {
  return `${type}:${id}`;
}

export type SceSelectorGroupCursors = Partial<Record<SceSelectorSourceType, string | null>>;

export type SceSelectorQueryInput = {
  tenantId: string;
  actorUserId: string;
  enabledTypes: readonly SceSelectorSourceType[];
  category: SceSelectorCategory;
  query: string;
  limitPerGroup?: number;
  /** Per-source offset cursors for browse/search continuation. */
  cursors?: SceSelectorGroupCursors;
  /** Communication-specific person resolution hint. */
  communicationContext?: "DIRECT" | "ORGANISATION" | "TARGET_GROUP_MANAGEMENT";
  /** Closed authorization context driving source authorization semantics. */
  authorizationContext?: import("@/lib/sce/list-selector/selector-authorization-context").SceSelectorAuthorizationContext;
  /** Optional domain hints (e.g. exclude already-selected assignees). */
  excludeUserIds?: readonly string[];
};
