import {
  resolveSceIconPixelSize,
  type SceIconGlyphProps,
} from "../SceIcon.types";
import { SceIconSvg } from "../SceIconSvg";
import { SCE_APPROVED_HERO_VIEWBOX } from "./approved-hero-meta";

type ApprovedMasterGlyphProps = SceIconGlyphProps;

function masterSvgProps({
  className,
  size = 24,
  title,
}: ApprovedMasterGlyphProps) {
  return {
    size: resolveSceIconPixelSize(size),
    viewBox: SCE_APPROVED_HERO_VIEWBOX,
    className,
    title,
  };
}

/** Geometry copied exactly from `public/images/icons/competition.svg` (V2 monochrome artwork). */
export function CompetitionApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M20 10h24v11c0 11-5 18-12 18s-12-7-12-18V10Z"/><path d="M32 39v9M23 54h18M27 48h10"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/page.svg` (V2 monochrome artwork). */
export function PageApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M16 8h23l11 11v37H16Z"/><path d="M39 8v12h11M23 31h20M23 40h20M23 49h13"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/media-library.svg` (V2 monochrome artwork). */
export function MediaLibraryApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="8" y="11" width="48" height="42" rx="6"/><circle cx="22" cy="25" r="5"/><path d="M12 47l13-13 8 8 7-7 12 12"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/block-library.svg` (V2 monochrome artwork). */
export function BlockLibraryApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="9" width="19" height="19" rx="3"/><rect x="36" y="9" width="19" height="19" rx="3"/><rect x="9" y="36" width="19" height="19" rx="3"/><rect x="36" y="36" width="19" height="19" rx="3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/website-navigation.svg` (V2 monochrome artwork). */
export function WebsiteNavigationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M11 16h42M11 32h30M11 48h22"/><circle cx="50" cy="32" r="4"/><circle cx="42" cy="48" r="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/homepage-builder.svg` (V2 monochrome artwork). */
export function HomepageBuilderApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="10" width="46" height="44" rx="6"/><path d="M9 22h46M20 32h24M20 42h15"/><path d="M16 16h1M23 16h1"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/goal.svg` (V2 monochrome artwork). */
export function GoalApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="23"/><circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="5"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/initiative.svg` (V2 monochrome artwork). */
export function InitiativeApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M20 28a12 12 0 1 1 24 0c0 6-4 9-7 13H27c-3-4-7-7-7-13Z"/><path d="M27 48h10M29 55h6M32 7v5M11 17l5 3M53 17l-5 3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/material-inventory.svg` (V2 monochrome artwork). */
export function MaterialInventoryApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 19l22-10 22 10-22 10Z"/><path d="M10 19v26l22 10 22-10V19M32 29v26"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/discipline-incident.svg` (V2 monochrome artwork). */
export function DisciplineIncidentApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 8l22 9v15c0 13-9 21-22 24-13-3-22-11-22-24V17Z"/><path d="M32 20v15M32 44h.1"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/target-group.svg` (V2 monochrome artwork). */
export function TargetGroupApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="13"/><circle cx="32" cy="32" r="4"/><path d="M47 17l9-9M47 17h9v-9"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/waiting-list.svg` (V2 monochrome artwork). */
export function WaitingListApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M12 14h26M12 26h26M12 38h20M12 50h14"/><circle cx="48" cy="42" r="9"/><path d="M48 37v6l4 2"/>
    </SceIconSvg>
  );
}

export const SCE_APPROVED_FINAL_SEMANTIC_MASTER_GLYPHS = [
  CompetitionApprovedMasterGlyph,
  PageApprovedMasterGlyph,
  MediaLibraryApprovedMasterGlyph,
  BlockLibraryApprovedMasterGlyph,
  WebsiteNavigationApprovedMasterGlyph,
  HomepageBuilderApprovedMasterGlyph,
  GoalApprovedMasterGlyph,
  InitiativeApprovedMasterGlyph,
  MaterialInventoryApprovedMasterGlyph,
  DisciplineIncidentApprovedMasterGlyph,
  TargetGroupApprovedMasterGlyph,
  WaitingListApprovedMasterGlyph,
] as const;
