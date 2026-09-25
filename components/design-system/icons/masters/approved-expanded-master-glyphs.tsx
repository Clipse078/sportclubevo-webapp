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

/** Geometry copied exactly from `public/images/icons/team.svg`. */
export function TeamApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="18" r="7" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <circle cx="15" cy="24" r="5" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <circle cx="49" cy="24" r="5" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M21 49c1-10 5-16 11-16s10 6 11 16" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M5 47c1-8 4-13 10-13M59 47c-1-8-4-13-10-13" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/season.svg`. */
export function SeasonApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="13" width="46" height="42" rx="6" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M9 25h46M20 8v10M44 8v10" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M26 36a9 9 0 0 0 0 12" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <path d="M38 36a9 9 0 0 1 0 12" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/standings.svg`. */
export function StandingsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 51V36h9v15" stroke="var(--sce-icon-secondary)" strokeWidth="5" />
        <path d="M27 51V25h10v26" stroke="var(--sce-icon-primary)" strokeWidth="5" />
        <path d="M44 51V32h9v19" stroke="var(--sce-icon-secondary)" strokeWidth="5" />
        <path d="M32 9l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.7 5.2-.8z" fill="var(--sce-icon-accent)" stroke="var(--sce-icon-accent)" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/results.svg`. */
export function ResultsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="15" width="48" height="32" rx="5" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M18 28h10l-10 9h10" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <path d="M35 29h1M35 37h1" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M43 28v9M40 28h3" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M25 10h14M24 52h16" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/attendance.svg`. */
export function AttendanceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="27" cy="18" r="7" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <circle cx="11" cy="24" r="5" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <circle cx="44" cy="24" r="5" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M16 49c1-10 5-16 11-16" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <circle cx="45" cy="44" r="10" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M40 44l4 4 7-8" stroke="var(--sce-icon-primary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/pitch.svg`. */
export function PitchApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="14" width="52" height="36" rx="3" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M32 14v36M6 22h9v20H6M58 22h-9v20h9" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <circle cx="32" cy="32" r="7" stroke="var(--sce-icon-accent)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/dressing-room.svg`. */
export function DressingRoomApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="11" width="21" height="42" rx="3" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <rect x="35" y="11" width="21" height="42" rx="3" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M14 20h9M41 20h9" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M14 29h9M41 29h9" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/organisation.svg`. */
export function OrganisationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="23" y="7" width="18" height="12" rx="3" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <rect x="5" y="43" width="16" height="12" rx="3" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <rect x="24" y="43" width="16" height="12" rx="3" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <rect x="43" y="43" width="16" height="12" rx="3" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <path d="M32 19v11M13 43V30h38v13M32 30v13" stroke="var(--sce-icon-primary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/org-unit.svg`. */
export function OrgUnitApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="9" width="22" height="18" rx="4" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <rect x="35" y="37" width="22" height="18" rx="4" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M18 27v12h28v-2M46 37V25H29" stroke="var(--sce-icon-primary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/people.svg`. */
export function PeopleApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="18" r="7" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <circle cx="14" cy="24" r="5" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <circle cx="50" cy="24" r="5" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M21 52c0-11 4-18 11-18s11 7 11 18M4 50c0-9 4-15 10-15M60 50c0-9-4-15-10-15" stroke="var(--sce-icon-primary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/roles-access.svg`. */
export function RolesAccessApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="20" r="8" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <path d="M9 50c1-12 6-19 15-19 6 0 10 3 13 9" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <circle cx="45" cy="40" r="11" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M45 34v12M39 40h12" stroke="var(--sce-icon-primary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/club.svg`. */
export function ClubApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 6l20 7v15c0 14-8 24-20 30C20 52 12 42 12 28V13z" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M32 12v39" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <path d="M20 21h24M22 37h20" stroke="var(--sce-icon-accent)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/documents.svg`. */
export function DocumentsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 7h24l10 10v40H15z" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M39 7v12h10M23 29h18M23 38h18M23 47h12" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <path d="M39 7l10 10" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/tasks.svg`. */
export function TasksApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="8" width="44" height="48" rx="5" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M18 22l4 4 7-8M18 38l4 4 7-8" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M34 22h12M34 38h12" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/requirements.svg`. */
export function RequirementsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 8h38v48H13z" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M21 20h22M21 30h22M21 40h13" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <circle cx="44" cy="44" r="9" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M41 44l2 2 5-5" stroke="var(--sce-icon-primary)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/events.svg`. */
export function EventsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="12" width="48" height="44" rx="5" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M8 25h48M19 7v11M45 7v11" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <path d="M22 35h20M22 44h13" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/communication.svg`. */
export function CommunicationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12h48v34H29L18 55v-9H8z" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M18 24h28M18 34h19" stroke="var(--sce-icon-secondary)" strokeWidth="4" />
        <circle cx="49" cy="15" r="6" fill="var(--sce-icon-accent)" stroke="var(--sce-icon-accent)" strokeWidth="2" />
      </g>
    </SceIconSvg>
  );
}
export const SCE_APPROVED_EXPANDED_MASTER_GLYPHS = [
  TeamApprovedMasterGlyph,
  SeasonApprovedMasterGlyph,
  StandingsApprovedMasterGlyph,
  ResultsApprovedMasterGlyph,
  AttendanceApprovedMasterGlyph,
  PitchApprovedMasterGlyph,
  DressingRoomApprovedMasterGlyph,
  OrganisationApprovedMasterGlyph,
  OrgUnitApprovedMasterGlyph,
  PeopleApprovedMasterGlyph,
  RolesAccessApprovedMasterGlyph,
  ClubApprovedMasterGlyph,
  DocumentsApprovedMasterGlyph,
  TasksApprovedMasterGlyph,
  RequirementsApprovedMasterGlyph,
  EventsApprovedMasterGlyph,
  CommunicationApprovedMasterGlyph,
] as const;
