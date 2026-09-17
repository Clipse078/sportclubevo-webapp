/**
 * PLANNING-HUB-02F2 — dark-first selected resource cards (Planning family).
 *
 * Resource-type semantics (TrainingCenter / allocation surfaces):
 *   pitch / hall → green accent
 *   dressing room → blue accent
 *
 * Activity-type colors (Wochenplaner) are separate — do not reuse these for events.
 */

/** Selected pitch/hall card — restrained green accent on dark surface. */
export const RESOURCE_CARD_PITCH_SELECTED_CLASSES =
  "border-emerald-500/45 bg-[var(--surface)] ring-1 ring-emerald-500/30 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]";

/** Selected dressing-room card — restrained blue accent on dark surface. */
export const RESOURCE_CARD_DRESSING_SELECTED_CLASSES =
  "border-[var(--blue)]/45 bg-[var(--surface)] ring-1 ring-[var(--blue)]/30 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]";

/** @deprecated Use RESOURCE_CARD_PITCH_SELECTED_CLASSES or RESOURCE_CARD_DRESSING_SELECTED_CLASSES. */
export const RESOURCE_CARD_SELECTED_CLASSES = RESOURCE_CARD_PITCH_SELECTED_CLASSES;

/** Selected pitch summary strip above pickers. */
export const RESOURCE_CARD_PITCH_SELECTED_SUMMARY_CLASSES =
  "rounded-lg border border-emerald-500/35 bg-[var(--surface)] px-3 py-2";

/** Selected dressing summary strip above pickers. */
export const RESOURCE_CARD_DRESSING_SELECTED_SUMMARY_CLASSES =
  "rounded-lg border border-[var(--blue)]/35 bg-[var(--surface)] px-3 py-2";

/** @deprecated Use pitch/dressing-specific summary classes. */
export const RESOURCE_CARD_SELECTED_SUMMARY_CLASSES = RESOURCE_CARD_PITCH_SELECTED_SUMMARY_CLASSES;

/** Dressing-room icon tile when selected. */
export const RESOURCE_CARD_DRESSING_SELECTED_ICON_TILE_CLASSES =
  "border-[var(--blue)]/45 bg-[var(--surface-2)] text-[var(--blue)]";

/** @deprecated Use RESOURCE_CARD_DRESSING_SELECTED_ICON_TILE_CLASSES. */
export const RESOURCE_CARD_SELECTED_ICON_TILE_CLASSES = RESOURCE_CARD_DRESSING_SELECTED_ICON_TILE_CLASSES;

/** Pitch resource icon accent (compact badges / glyphs). */
export const RESOURCE_SEMANTIC_PITCH_ICON_CLASS = "text-emerald-400";

/** Dressing-room resource icon accent. */
export const RESOURCE_SEMANTIC_DRESSING_ICON_CLASS = "text-[var(--blue)]";
