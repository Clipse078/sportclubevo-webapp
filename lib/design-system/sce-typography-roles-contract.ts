/**
 * SCE-DS2-03 — Sporting typography roles (SC Cham–inspired display hierarchy).
 * @see docs/design-system-v2/04-typography-and-navigation.md
 */
import { SCE_DS2_TYPOGRAPHY_FOUNDATION } from "./sce-foundation-contract";
import { SCE_DS2_03_PACKAGE_KEY } from "./sce-ds2-03-meta";

export const SCE_DS2_TYPOGRAPHY_ROLE_CLASSES = {
  pageTitle: "sce-type-page-title",
  sectionTitle: "sce-type-section-title",
  sectionTitleDisplay: "sce-type-section-title sce-type-section-title--display",
  cardTitle: "sce-type-card-title",
  primaryNav: "sce-header-nav-label",
  secondaryNav: "sce-ds2-secondary-nav-label",
  teamName: "sce-team-name",
  body: "sce-type-body",
} as const;

export const SCE_DS2_TYPOGRAPHY_ROLES = {
  packageId: SCE_DS2_03_PACKAGE_KEY,
  displayFontStack: SCE_DS2_TYPOGRAPHY_FOUNDATION.display,
  bodyFontStack: SCE_DS2_TYPOGRAPHY_FOUNDATION.body,
  pageTitle: {
    family: "display",
    transform: "uppercase",
    weight: "700-800",
    style: "italic",
    class: SCE_DS2_TYPOGRAPHY_ROLE_CLASSES.pageTitle,
  },
  sectionTitle: {
    family: "display",
    transform: "uppercase",
    weight: "700",
    style: "normal",
    class: SCE_DS2_TYPOGRAPHY_ROLE_CLASSES.sectionTitle,
  },
  primaryHeaderNav: {
    family: "display",
    transform: "uppercase",
    weight: "700",
    style: "normal",
    ownerPackage: "SCE-DS2-02",
  },
  secondaryNav: {
    family: "display",
    transform: "uppercase",
    weight: "600",
    style: "normal",
    class: SCE_DS2_TYPOGRAPHY_ROLE_CLASSES.secondaryNav,
  },
  teamName: {
    family: "display",
    transform: "uppercase",
    weight: "700",
    style: "italic",
    class: SCE_DS2_TYPOGRAPHY_ROLE_CLASSES.teamName,
  },
  body: {
    family: "body",
    transform: "none",
    class: SCE_DS2_TYPOGRAPHY_ROLE_CLASSES.body,
  },
} as const;
