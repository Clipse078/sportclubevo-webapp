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

/** Geometry copied exactly from `public/images/icons/absence.svg`. */
export function AbsenceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="13" width="44" height="40" rx="5" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M10 24h44M20 9v9M44 9v9" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M23 34l18 14M41 34L23 48" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/assignment.svg`. */
export function AssignmentApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="20" r="6" stroke="var(--sce-icon-primary)" strokeWidth="4" /><circle cx="46" cy="20" r="6" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M18 31v15M46 31v15M24 38h16" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M34 32l6 6-6 6" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/availability.svg`. */
export function AvailabilityApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="13" width="44" height="40" rx="5" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M10 24h44M20 9v9M44 9v9" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M21 39l7 7 15-17" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/check-in.svg`. */
export function CheckInApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 55s15-15 15-29a15 15 0 1 0-30 0c0 14 15 29 15 29z" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M24 27l6 6 11-13" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/coach.svg`. */
export function CoachApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="18" r="7" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M12 51c1-12 5-18 12-18s11 6 12 18" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><rect x="39" y="18" width="14" height="20" rx="3" stroke="var(--sce-icon-accent)" strokeWidth="4" /><path d="M43 25h6M43 31h4" stroke="var(--sce-icon-primary)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/committee-board.svg`. */
export function CommitteeBoardApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="14" r="5" stroke="var(--sce-icon-accent)" strokeWidth="4" /><circle cx="15" cy="25" r="5" stroke="var(--sce-icon-primary)" strokeWidth="4" /><circle cx="49" cy="25" r="5" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M9 51c1-9 3-14 6-14s6 5 7 14M25 51c1-11 3-17 7-17s6 6 7 17M42 51c1-9 4-14 7-14s5 5 6 14" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/contact.svg`. */
export function ContactApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="11" y="12" width="42" height="40" rx="6" stroke="var(--sce-icon-primary)" strokeWidth="4" /><circle cx="26" cy="27" r="6" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M18 43c1-7 4-10 8-10s7 3 8 10M40 24h7M40 32h7M40 40h5" stroke="var(--sce-icon-accent)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/facility.svg`. */
export function FacilityApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 52V24l22-13 22 13v28" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M19 52V31h26v21M27 52V39h10v13" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M32 11v13" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/guardian-parent.svg`. */
export function GuardianParentApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="22" cy="20" r="6" stroke="var(--sce-icon-primary)" strokeWidth="4" /><circle cx="43" cy="25" r="5" stroke="var(--sce-icon-accent)" strokeWidth="4" /><path d="M11 51c1-11 5-17 11-17s10 6 11 17M35 51c1-8 3-13 8-13s8 5 9 13" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/invitation.svg`. */
export function InvitationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 20l22 16 22-16v28H10V20z" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M10 20l22-10 22 10" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M32 25v-9M27 20l5-5 5 5" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/member.svg`. */
export function MemberApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="25" cy="19" r="7" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M12 51c1-12 6-18 13-18s12 6 13 18" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><circle cx="47" cy="40" r="9" stroke="var(--sce-icon-accent)" strokeWidth="4" /><path d="M43 40l3 3 5-6" stroke="var(--sce-icon-primary)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/partner.svg`. */
export function PartnerApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 31l11-11 12 8 12-8 11 11-13 15-10-7-10 7L9 31z" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M23 29l9 7 9-7M32 36v10" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M27 49h10" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/player.svg`. */
export function PlayerApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="17" r="7" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M19 51c1-12 6-19 13-19s12 7 13 19" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M24 35l8 8 8-8" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/sponsor.svg`. */
export function SponsorApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 22l10-9 11 9 11-9 10 9-5 30H16l-5-30z" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M21 13l11 18 11-18" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M25 42h14" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/team-management.svg`. */
export function TeamManagementApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="17" r="6" stroke="var(--sce-icon-primary)" strokeWidth="4" /><circle cx="15" cy="25" r="5" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><circle cx="49" cy="25" r="5" stroke="var(--sce-icon-secondary)" strokeWidth="4" /><path d="M20 51c1-11 5-17 12-17s11 6 12 17M7 49c1-8 3-13 8-13M57 49c-1-8-3-13-8-13" stroke="var(--sce-icon-primary)" strokeWidth="4" /><circle cx="49" cy="45" r="8" stroke="var(--sce-icon-accent)" strokeWidth="3" /><path d="M49 41v8M45 45h8" stroke="var(--sce-icon-accent)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/volunteer.svg`. */
export function VolunteerApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 53S10 40 10 23c0-7 5-12 12-12 5 0 8 3 10 7 2-4 5-7 10-7 7 0 12 5 12 12 0 17-22 30-22 30z" stroke="var(--sce-icon-primary)" strokeWidth="4" /><path d="M21 31h22M32 20v22" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
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
