/**
 * Canonical SCE floating / modal stacking order (portalled to document.body).
 *
 * base application (≤40 sidebar)
 *   → composer / dialog overlay root (100)
 *   → composer-owned popovers (105) — calendar, combobox inside composer
 *   → elevated child dialog (110) — e.g. club/team selector over composer
 */

export const SCE_Z_INDEX_FLOATING_APP = 70;
/** Contextual hover/focus previews above app floaters, below modal stack (DS-11). */
export const SCE_Z_INDEX_CONTEXTUAL_PREVIEW = 80;
export const SCE_Z_INDEX_MODAL_OVERLAY = 100;
export const SCE_Z_INDEX_COMPOSER_POPOVER = 105;
export const SCE_Z_INDEX_MODAL_OVERLAY_ELEVATED = 110;

/** Tailwind-safe class tokens (mirrored in app/globals.css). */
export const SCE_FLOATING_LAYER_APP_CLASS = "sce-floating-layer-app";
export const SCE_FLOATING_LAYER_COMPOSER_CLASS = "sce-floating-layer-composer";
export const SCE_CONTEXTUAL_PREVIEW_LAYER_CLASS = "sce-contextual-preview-layer";

export type SceFloatingLayer = "app" | "composer";

export function resolveSceFloatingLayerClass(layer: SceFloatingLayer): string {
  return layer === "composer" ? SCE_FLOATING_LAYER_COMPOSER_CLASS : SCE_FLOATING_LAYER_APP_CLASS;
}
