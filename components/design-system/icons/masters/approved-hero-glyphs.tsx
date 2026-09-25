import type { ComponentType } from "react";
import {
  resolveSceIconPixelSize,
  type SceIconGlyphProps,
} from "../SceIcon.types";
import { SceIconSvg } from "../SceIconSvg";
import { SCE_APPROVED_EXPANDED_MASTER_GLYPHS } from "./approved-expanded-master-glyphs";
import { SCE_APPROVED_PLATFORM_MASTER_GLYPHS } from "./approved-platform-master-glyphs";
import { SCE_APPROVED_HERO_VIEWBOX } from "./approved-hero-meta";

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

/** Geometry copied exactly from `public/images/icons/dashboard.svg`. */
export function DashboardApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="19" height="19" rx="4" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <rect x="37" y="8" width="19" height="19" rx="4" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <rect x="8" y="37" width="19" height="19" rx="4" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <rect x="37" y="37" width="19" height="19" rx="4" stroke="var(--sce-icon-primary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/week-planner.svg`. */
export function WeekPlannerApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="11" width="50" height="46" rx="6" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M7 23h50M18 6v10M46 6v10" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <rect x="13" y="29" width="10" height="7" rx="1.5" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <rect x="27" y="29" width="10" height="7" rx="1.5" stroke="var(--sce-icon-primary)" strokeWidth="3" />
        <rect x="41" y="29" width="10" height="7" rx="1.5" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <rect x="13" y="42" width="10" height="7" rx="1.5" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <rect x="27" y="42" width="10" height="7" rx="1.5" stroke="var(--sce-icon-accent)" strokeWidth="3" />
        <rect x="41" y="42" width="10" height="7" rx="1.5" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/training.svg`. */
export function TrainingApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12v42h18" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M8 31h10a10 10 0 0 0-10-10" stroke="var(--sce-icon-primary)" strokeWidth="3" />
        <circle cx="45" cy="12" r="5" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M27 46c10 0 18-7 20-18" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M42 31l5-5 4 6" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M30 20l7 7M37 20l-7 7M45 45l8 8M53 45l-8 8" stroke="var(--sce-icon-primary)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/match.svg`. */
export function MatchApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13A23 23 0 0 0 11 32a23 23 0 0 0 7 19" stroke="var(--sce-icon-secondary)" strokeWidth="5" />
        <path d="M46 13a23 23 0 0 1 7 19 23 23 0 0 1-7 19" stroke="var(--sce-icon-primary)" strokeWidth="5" />
        <path d="M25 9a23 23 0 0 1 14 0M25 55a23 23 0 0 0 14 0" stroke="var(--sce-icon-accent)" strokeWidth="5" />
        <path d="M23.11 38.72L17.71 24.14L21.49 24.14L25.36 34.90L29.21 24.14L32.99 24.14L27.59 38.72 M45.14 24.60L45.14 27.68Q43.94 27.14 42.80 26.87Q41.65 26.60 40.64 26.60Q39.29 26.60 38.64 26.97Q38 27.34 38 28.12Q38 28.71 38.43 29.03Q38.87 29.36 40.01 29.60L41.61 29.92Q44.05 30.41 45.07 31.40Q46.10 32.40 46.10 34.23Q46.10 36.65 44.67 37.82Q43.23 39 40.30 39Q38.91 39 37.51 38.74Q36.12 38.47 34.72 37.96L34.72 34.78Q36.12 35.52 37.42 35.90Q38.72 36.28 39.93 36.28Q41.16 36.28 41.82 35.87Q42.47 35.46 42.47 34.69Q42.47 34.01 42.03 33.64Q41.58 33.27 40.26 32.97L38.80 32.65Q36.61 32.18 35.60 31.16Q34.59 30.13 34.59 28.39Q34.59 26.22 36 25.04Q37.40 23.87 40.04 23.87Q41.24 23.87 42.51 24.05Q43.78 24.23 45.14 24.60" fill="var(--sce-icon-primary)" stroke="none" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/tournament.svg`. */
export function TournamentApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 8h18v10c0 9-4 15-9 18-5-3-9-9-9-18z" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M23 12H13v5c0 7 5 11 11 11M41 12h10v5c0 7-5 11-11 11" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M32 36v8M25 45h14" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M11 51h42M16 51v7M32 51v7M48 51v7" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <rect x="11" y="56" width="10" height="4" rx="1" stroke="var(--sce-icon-primary)" strokeWidth="2.5" />
        <rect x="27" y="56" width="10" height="4" rx="1" stroke="var(--sce-icon-accent)" strokeWidth="2.5" />
        <rect x="43" y="56" width="10" height="4" rx="1" stroke="var(--sce-icon-primary)" strokeWidth="2.5" />
      </g>
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
  ] as readonly ComponentType<SceIconGlyphProps>[];
  return all.includes(glyph);
}
