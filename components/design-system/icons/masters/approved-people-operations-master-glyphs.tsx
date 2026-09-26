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

/** Geometry copied exactly from `public/images/icons/absence.svg` (V2 monochrome artwork). */
export function AbsenceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="12" width="46" height="43" rx="7"/><path d="M9 24h46M20 8v9M44 8v9"/><path d="M20 35l24 14M44 35L20 49"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/assignment.svg` (V2 monochrome artwork). */
export function AssignmentApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="12" y="10" width="40" height="44" rx="6"/><path d="M22 24h20M22 34h20M22 44h10"/><path d="M17 24h1M17 34h1M17 44h1"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/availability.svg` (V2 monochrome artwork). */
export function AvailabilityApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="12" width="46" height="43" rx="7"/><path d="M9 24h46M20 8v9M44 8v9"/><path d="M12 33l13 13 28-30"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/check-in.svg` (V2 monochrome artwork). */
export function CheckInApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="21" r="9"/><path d="M14 53c1-13 8-21 18-21s17 8 18 21"/><path d="M12 33l13 13 28-30"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/coach.svg` (V2 monochrome artwork). */
export function CoachApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="21" r="9"/><path d="M14 53c1-13 8-21 18-21s17 8 18 21"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/committee-board.svg` (V2 monochrome artwork). */
export function CommitteeBoardApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 55h44M15 55V20l17-10 17 10v35M24 55V41h16v14M23 27h4M37 27h4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/contact.svg` (V2 monochrome artwork). */
export function ContactApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="21" r="9"/><path d="M14 53c1-13 8-21 18-21s17 8 18 21"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/facility.svg` (V2 monochrome artwork). */
export function FacilityApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 55h44M15 55V20l17-10 17 10v35M24 55V41h16v14M23 27h4M37 27h4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/guardian-parent.svg` (V2 monochrome artwork). */
export function GuardianParentApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="23" cy="20" r="8"/><circle cx="43" cy="30" r="6"/><path d="M8 52c1-13 6-21 15-21 7 0 11 4 14 11M35 53c1-8 3-13 8-13s8 5 9 13"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/invitation.svg` (V2 monochrome artwork). */
export function InvitationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="8" y="15" width="48" height="34" rx="6"/><path d="M9 20l23 17 23-17"/><path d="M45 9v12M39 15h12"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/member.svg` (V2 monochrome artwork). */
export function MemberApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="21" r="9"/><path d="M14 53c1-13 8-21 18-21s17 8 18 21"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/partner.svg` (V2 monochrome artwork). */
export function PartnerApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 31l12-10 10 7 10-7 12 10-22 22Z"/><path d="M22 21l10 10 10-10"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/player.svg` (V2 monochrome artwork). */
export function PlayerApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="21" r="9"/><path d="M14 53c1-13 8-21 18-21s17 8 18 21"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/sponsor.svg` (V2 monochrome artwork). */
export function SponsorApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M8 29l10-10 12 8 4-3 12 8 10-5v19H8Z"/><path d="M8 46h48"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/team-management.svg` (V2 monochrome artwork). */
export function TeamManagementApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="25" cy="20" r="8"/><path d="M9 49c1-11 6-18 16-18 5 0 9 2 12 6"/><circle cx="46" cy="43" r="9"/><path d="M46 29v5M46 52v5M32 43h5M55 43h5"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/volunteer.svg` (V2 monochrome artwork). */
export function VolunteerApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="21" r="9"/><path d="M14 53c1-13 8-21 18-21s17 8 18 21"/>
    </SceIconSvg>
  );
}

export const SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_GLYPHS = [
  AbsenceApprovedMasterGlyph,
  AssignmentApprovedMasterGlyph,
  AvailabilityApprovedMasterGlyph,
  CheckInApprovedMasterGlyph,
  CoachApprovedMasterGlyph,
  CommitteeBoardApprovedMasterGlyph,
  ContactApprovedMasterGlyph,
  FacilityApprovedMasterGlyph,
  GuardianParentApprovedMasterGlyph,
  InvitationApprovedMasterGlyph,
  MemberApprovedMasterGlyph,
  PartnerApprovedMasterGlyph,
  PlayerApprovedMasterGlyph,
  SponsorApprovedMasterGlyph,
  TeamManagementApprovedMasterGlyph,
  VolunteerApprovedMasterGlyph,
] as const;
