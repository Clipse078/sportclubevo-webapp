/**
 * SCE-ACTIVITY-CREATE — nested interaction rule (ADR-11 / 01A gate).
 *
 * A modal Activity Composer must not launch another independent modal, dialog, sheet,
 * or drawer over itself for normal creation interactions.
 *
 * Preferred hierarchy:
 * 1. inline
 * 2. combobox/search
 * 3. popover
 * 4. expandable region
 * 5. Composer-owned embedded panel (`secondaryPanel` slot)
 *
 * If an interaction cannot safely fit, use page mode — not stacked dialogs.
 */
export const SCE_ACTIVITY_COMPOSER_NESTED_INTERACTION_RULE =
  "NO_INDEPENDENT_NESTED_MODAL_OVER_COMPOSER" as const;
