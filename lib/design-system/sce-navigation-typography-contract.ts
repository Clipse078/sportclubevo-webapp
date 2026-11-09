/**
 * SCE-DS2-02 — Premium header navigation typography (icon-free L1 labels).
 * Values are applied via `app/(admin)/global-app-navigation.css` and legacy `.sce-nav-item`.
 */

import { SCE_DS2_TYPOGRAPHY_FOUNDATION } from "./sce-foundation-contract";

export const SCE_DS2_HEADER_NAV_TYPOGRAPHY = {
  packageId: "SCE-DS2-02",
  labelClassName: "sce-header-nav-label",
  displayFontStack: SCE_DS2_TYPOGRAPHY_FOUNDATION.display,
  bodyFontStack: SCE_DS2_TYPOGRAPHY_FOUNDATION.body,
  labelTransform: "uppercase" as const,
  /** Tuned for Barlow Condensed L1 density */
  primaryLetterSpacingEm: 0.04,
  /** WCAG-aligned tap target for header / mobile primary items */
  minTapHeightPx: 44,
  decorativeNavIcons: false,
} as const;

/** Primary L1 chrome selectors covered by DS2-02 */
export const SCE_DS2_HEADER_NAV_SURFACE_SELECTORS = [
  ".sce-global-primary-nav-domain-label",
  ".sce-global-primary-nav-item",
  ".sce-global-nav-overflow-panel [role='menuitem']",
  ".sce-mobile-bottom-nav-item",
  ".sce-domain-nav-panel-l2-link",
  ".sce-domain-nav-panel-l2-control",
  ".sce-domain-nav-panel-l3-link",
  ".sce-domain-nav-panel-section-title",
  ".sce-app-explorer-domain-rail [role='tab']",
] as const;
