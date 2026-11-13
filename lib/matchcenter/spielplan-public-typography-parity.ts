/**
 * SCE-MATCHCENTER-UX — Public Spielplan vs SCE Matchcenter typography reference.
 *
 * Source of truth: DS2-03 + globals.css `.sce-team-name` (same tokens as public
 * programme-fixture / Wochenplan match rows via SceMatchFixtureReferenceLayout).
 */

import { SCE_DS2_TYPOGRAPHY_ROLES } from "@/lib/design-system/sce-typography-roles-contract";

export type SpielplanTypographyReference = {
  role: "teamName";
  family: string;
  weight: number;
  style: string;
  transform: string;
  sizeRem: number;
  letterSpacingEm: number;
  lineHeight: number;
  cssClass: string;
  token: string;
};

export const PUBLIC_SPIELPLAN_TEAM_NAME_REFERENCE: SpielplanTypographyReference = {
  role: "teamName",
  family: 'var(--font-display), "Barlow Condensed", Arial, sans-serif',
  weight: 700,
  style: "italic",
  transform: "uppercase",
  sizeRem: 0.875,
  letterSpacingEm: 0.02,
  lineHeight: 1.25,
  cssClass: "sce-team-name sce-team-name--standard",
  token: SCE_DS2_TYPOGRAPHY_ROLES.teamName.class,
};
