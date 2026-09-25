import type { ComponentType } from "react";
import {
  resolveSceIconPixelSize,
  type SceIconGlyphProps,
} from "../SceIcon.types";
import { SceIconSvg } from "../SceIconSvg";
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
        <rect
          x="8"
          y="8"
          width="19"
          height="19"
          rx="4"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <rect
          x="37"
          y="8"
          width="19"
          height="19"
          rx="4"
          stroke="var(--sce-icon-accent)"
          strokeWidth="4"
        />
        <rect
          x="8"
          y="37"
          width="19"
          height="19"
          rx="4"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <rect
          x="37"
          y="37"
          width="19"
          height="19"
          rx="4"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/week-planner.svg`. */
export function WeekPlannerApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="7"
          y="11"
          width="50"
          height="46"
          rx="6"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path d="M7 23h50M18 6v10M46 6v10" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <rect
          x="13"
          y="29"
          width="10"
          height="7"
          rx="1.5"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
        <rect
          x="27"
          y="29"
          width="10"
          height="7"
          rx="1.5"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <rect
          x="41"
          y="29"
          width="10"
          height="7"
          rx="1.5"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
        <rect
          x="13"
          y="42"
          width="10"
          height="7"
          rx="1.5"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
        <rect
          x="27"
          y="42"
          width="10"
          height="7"
          rx="1.5"
          stroke="var(--sce-icon-accent)"
          strokeWidth="3"
        />
        <rect
          x="41"
          y="42"
          width="10"
          height="7"
          rx="1.5"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
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
        <path
          d="M8 31h10a10 10 0 0 0-10-10"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <circle cx="45" cy="12" r="5" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M27 46c10 0 18-7 20-18" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M42 31l5-5 4 6" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path
          d="M30 20l7 7M37 20l-7 7M45 45l8 8M53 45l-8 8"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/match.svg`. */
export function MatchApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="32" r="24" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path
          d="M25 24l7-5 7 5-3 9h-8zM25 24l-9-3M39 24l9-3M28 33l-7 9M36 33l7 9M21 42l-1 9M43 42l1 9"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <path
          d="M48 21c4 5 6 11 6 17M44 13c3 2 5 4 7 7"
          stroke="var(--sce-icon-accent)"
          strokeWidth="4"
        />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/tournament.svg`. */
export function TournamentApprovedMasterGlyph(props: ApprovedHeroGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M23 8h18v10c0 9-4 15-9 18-5-3-9-9-9-18z"
          stroke="var(--sce-icon-accent)"
          strokeWidth="4"
        />
        <path
          d="M23 12H13v5c0 7 5 11 11 11M41 12h10v5c0 7-5 11-11 11"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path d="M32 36v8M25 45h14" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M11 51h42M16 51v7M32 51v7M48 51v7" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <rect
          x="11"
          y="56"
          width="10"
          height="4"
          rx="1"
          stroke="var(--sce-icon-primary)"
          strokeWidth="2.5"
        />
        <rect
          x="27"
          y="56"
          width="10"
          height="4"
          rx="1"
          stroke="var(--sce-icon-accent)"
          strokeWidth="2.5"
        />
        <rect
          x="43"
          y="56"
          width="10"
          height="4"
          rx="1"
          stroke="var(--sce-icon-primary)"
          strokeWidth="2.5"
        />
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
  return (SCE_APPROVED_HERO_GLYPHS as readonly ComponentType<SceIconGlyphProps>[]).includes(
    glyph,
  );
}
