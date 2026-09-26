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
      <path d="M18 12h28v8c0 11-5 20-14 24-9-4-14-13-14-24v-8Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 17H9v5c0 8 5 13 12 14M46 17h9v5c0 8-5 13-12 14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M32 44v8M24 56h16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="32" cy="27" r="4" fill="currentColor"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/page.svg` (V2 monochrome artwork). */
export function PageApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M17 8h22l10 10v38H17V8Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M39 8v11h10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M24 29h17M24 37h17M24 45h10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M40 45h4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/media-library.svg` (V2 monochrome artwork). */
export function MediaLibraryApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="12" y="16" width="36" height="34" rx="3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 16v-5h34v31h-4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="39" cy="26" r="3" fill="currentColor"/><path d="m18 43 9-10 8 8 5-5 8 8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/block-library.svg` (V2 monochrome artwork). */
export function BlockLibraryApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="10" y="10" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><rect x="36" y="10" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><rect x="10" y="36" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><rect x="36" y="36" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M45 40v10M40 45h10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/website-navigation.svg` (V2 monochrome artwork). */
export function WebsiteNavigationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="8" y="12" width="48" height="40" rx="5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 23h48" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="15" cy="18" r="2" fill="currentColor"/><circle cx="22" cy="18" r="2" fill="currentColor"/><circle cx="29" cy="18" r="2" fill="currentColor"/><path d="m27 31 18 9-8 3-3 8-7-20Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/homepage-builder.svg` (V2 monochrome artwork). */
export function HomepageBuilderApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="7" y="11" width="50" height="42" rx="5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 22h50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="14" cy="17" r="2" fill="currentColor"/><circle cx="21" cy="17" r="2" fill="currentColor"/><circle cx="28" cy="17" r="2" fill="currentColor"/><rect x="14" y="29" width="12" height="17" rx="2" fill="currentColor"/><path d="M32 31h17M32 38h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M32 45h9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/goal.svg` (V2 monochrome artwork). */
export function GoalApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="29" cy="33" r="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="29" cy="33" r="12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="29" cy="33" r="4" fill="currentColor"/><path d="m29 33 18-18M42 12h9v9M47 15l5-5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/initiative.svg` (V2 monochrome artwork). */
export function InitiativeApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M22 30c0-8 5-14 12-14s12 6 12 14c0 5-3 8-6 11v6H28v-6c-3-3-6-6-6-11Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M28 52h12M30 47h8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M34 8V4M16 15l-3-3M52 15l3-3M13 31H8M55 31h5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/material-inventory.svg` (V2 monochrome artwork). */
export function MaterialInventoryApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M8 51h48M12 51V25l20-12 20 12v26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 29h28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><rect x="18" y="37" width="12" height="14" rx="1" fill="currentColor" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><rect x="34" y="33" width="12" height="18" rx="1" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M38 38h4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/discipline-incident.svg` (V2 monochrome artwork). */
export function DisciplineIncidentApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 7 50 15v14c0 12-7 21-18 28-11-7-18-16-18-28V15L32 7Z" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M32 20v15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="32" cy="43" r="2.5" fill="currentColor"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/target-group.svg` (V2 monochrome artwork). */
export function TargetGroupApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="35" r="8" fill="currentColor" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="17" cy="38" r="6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="47" cy="38" r="6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 54v-5c0-5 5-8 12-8s12 3 12 8v5M7 54v-4c0-4 4-7 10-7M57 54v-4c0-4-4-7-10-7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="32" cy="13" r="5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="32" cy="13" r="2" fill="currentColor"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/waiting-list.svg` (V2 monochrome artwork). */
export function WaitingListApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M12 31a20 20 0 1 1 37 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M32 14v14l-9 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="34" cy="43" r="5" fill="currentColor" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="48" cy="45" r="4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M25 57v-4c0-4 4-6 9-6s9 2 9 6v4M43 57v-3c0-3 2-5 5-5s6 2 6 5v3" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
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
