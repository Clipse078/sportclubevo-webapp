/**
 * SCE-DESIGN-SYSTEM-04 — canonical information hierarchy layers for cards/panels.
 *
 * Not every surface renders every layer. Avoid filler and repeated information.
 */
export const SCE_INFORMATION_HIERARCHY_LAYERS = [
  "SEMANTIC_CATEGORY",
  "PRIMARY_IDENTITY",
  "PRIMARY_INFORMATION",
  "SECONDARY_CONTEXT",
  "METADATA",
  "STATUS",
  "ACTIONS",
] as const;

export type SceInformationHierarchyLayer =
  (typeof SCE_INFORMATION_HIERARCHY_LAYERS)[number];

export const SCE_CARD_INTERACTION_SEMANTICS = [
  "INFORMATIONAL",
  "NAVIGATIONAL",
  "INTERACTIVE",
  "SELECTABLE",
] as const;

export type SceCardInteractionSemantic =
  (typeof SCE_CARD_INTERACTION_SEMANTICS)[number];
