import {
  resolveSceIconPixelSize,
  type SceIconGlyphProps,
} from "../SceIcon.types";
import { SceIconSvg } from "../SceIconSvg";
import { SCE_APPROVED_HERO_VIEWBOX } from "./approved-hero-meta";

import type { ComponentType } from "react";
import { SCE_APPROVED_EXPANDED_MASTER_GLYPHS } from "./approved-expanded-master-glyphs";
import { SCE_APPROVED_ANALYTICS_WORKFLOW_MASTER_GLYPHS } from "./approved-analytics-workflow-master-glyphs";
import { SCE_APPROVED_FINANCE_COMMERCIAL_MASTER_GLYPHS } from "./approved-finance-commercial-master-glyphs";
import { SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_GLYPHS } from "./approved-people-operations-master-glyphs";
import { SCE_APPROVED_PLATFORM_MASTER_GLYPHS } from "./approved-platform-master-glyphs";
import { SCE_APPROVED_FINAL_SEMANTIC_MASTER_GLYPHS } from "./approved-final-semantic-master-glyphs";

type ApprovedHeroGlyphProps = SceIconGlyphProps;

function masterSvgProps({
  className,
  size = 24,
  title,
}: ApprovedHeroGlyphProps) {
  return {
    size: resolveSceIconPixelSize(size),
    viewBox: SCE_APPROVED_HERO_VIEWBOX,
    className,
    title,
  };
}

/** Geometry copied exactly from `public/images/icons/dashboard.svg` (V2 monochrome artwork). */
export function DashboardApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="9" width="19" height="19" rx="4"/><rect x="36" y="9" width="19" height="19" rx="4"/><rect x="9" y="36" width="19" height="19" rx="4"/><rect x="36" y="36" width="19" height="19" rx="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/week-planner.svg` (V2 monochrome artwork). */
export function WeekPlannerApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="8" y="12" width="48" height="43" rx="7"/><path d="M8 24h48M20 8v9M44 8v9"/><path d="M18 33h7M29 33h7M40 33h7M18 43h7M29 43h7M40 43h7"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/training.svg` (V2 monochrome artwork). */
export function TrainingApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="7" y="10" width="50" height="44" rx="6"/><path d="M32 10v44M7 32h50"/><circle cx="32" cy="32" r="7"/><path d="M13 18h8v8h-8M43 38h8v8h-8"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/match.svg` (V2 monochrome artwork). */
export function MatchApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M22 15a18 18 0 1 0 0 34M42 15a18 18 0 1 1 0 34"/><path d="M23 26l6 12M29 26l-6 12M35 26v12M35 26h5a4 4 0 0 1 0 8h-5"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/tournament.svg` (V2 monochrome artwork). */
export function TournamentApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M20 10h24v11c0 11-5 18-12 18s-12-7-12-18V10Z"/><path d="M20 16H11v4c0 8 5 13 12 13M44 16h9v4c0 8-5 13-12 13M32 39v9M23 54h18M27 48h10"/>
    </SceIconSvg>
  );
}

export const SCE_APPROVED_HERO_GLYPHS = [
  DashboardApprovedMasterGlyph,
  WeekPlannerApprovedMasterGlyph,
  TrainingApprovedMasterGlyph,
  MatchApprovedMasterGlyph,
  TournamentApprovedMasterGlyph,
] as const;

export function isSceApprovedMasterGlyph(glyph: ComponentType<SceIconGlyphProps>): boolean {
  const all = [
    ...SCE_APPROVED_HERO_GLYPHS,
    ...SCE_APPROVED_EXPANDED_MASTER_GLYPHS,
    ...SCE_APPROVED_PLATFORM_MASTER_GLYPHS,
    ...SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_GLYPHS,
    ...SCE_APPROVED_FINANCE_COMMERCIAL_MASTER_GLYPHS,
    ...SCE_APPROVED_ANALYTICS_WORKFLOW_MASTER_GLYPHS,
    ...SCE_APPROVED_FINAL_SEMANTIC_MASTER_GLYPHS,
  ] as readonly ComponentType<SceIconGlyphProps>[];
  return all.includes(glyph);
}
