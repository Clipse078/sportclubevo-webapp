export const SCE_SELECTOR_DEFAULT_SEARCH_LIMIT = 20;
export const SCE_SELECTOR_DEFAULT_BROWSE_LIMIT = 12;
export const SCE_SELECTOR_MIN_SEARCH_LENGTH = 2;
export const SCE_SELECTOR_SEARCH_DEBOUNCE_MS = 250;

/** Per-group caps when category is "all" (browse-first). */
export const SCE_SELECTOR_ALL_CATEGORY_BROWSE_LIMITS: Partial<Record<string, number>> = {
  ORG_UNIT: 5,
  TEAM: 10,
  ROLE: 5,
  PERSON: 10,
  USER: 10,
  EXTERNAL_CONTACT: 10,
  TARGET_GROUP: 10,
};
