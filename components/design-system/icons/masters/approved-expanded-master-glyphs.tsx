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
        <circle cx="22" cy="22" r="6" stroke="var(--sce-icon-primary)" strokeWidth="3.5" />
        <circle cx="42" cy="22" r="6" stroke="var(--sce-icon-primary)" strokeWidth="3.5" />
        <circle cx="32" cy="16" r="6" stroke="var(--sce-icon-secondary)" strokeWidth="3.5" />
        <path
          d="M10 46c0-8 6-12 12-12M42 34c6 0 12 4 12 12"
          stroke="var(--sce-icon-muted)"
          strokeWidth="3"
        />
        <path
          d="M22 34c5 0 10 4 10 12M32 28c6 0 10 4 10 10"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <path d="M28 40h8" stroke="var(--sce-icon-accent)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/season.svg`. */
export function SeasonApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="10"
          y="14"
          width="44"
          height="42"
          rx="6"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path d="M10 26h44M22 8v12M42 8v12" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path
          d="M46 18a14 14 0 1 1-4-10"
          stroke="var(--sce-icon-accent)"
          strokeWidth="3.5"
        />
        <path d="M46 18l-6-2 2 6" stroke="var(--sce-icon-accent)" strokeWidth="3.5" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/standings.svg`. */
export function StandingsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 52h48" stroke="var(--sce-icon-muted)" strokeWidth="3" />
        <rect
          x="12"
          y="34"
          width="12"
          height="18"
          rx="2"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
        <rect
          x="26"
          y="22"
          width="12"
          height="30"
          rx="2"
          stroke="var(--sce-icon-accent)"
          strokeWidth="3.5"
        />
        <rect
          x="40"
          y="40"
          width="12"
          height="12"
          rx="2"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <path
          d="M18 30V18M32 18v4M46 36v4"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/results.svg`. */
export function ResultsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="8"
          y="18"
          width="20"
          height="28"
          rx="4"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <rect
          x="36"
          y="18"
          width="20"
          height="28"
          rx="4"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <circle cx="32" cy="32" r="3" fill="var(--sce-icon-accent)" />
        <path
          d="M14 28h8M14 36h8M42 28h8M42 36h8"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
        <path d="M32 46v6" stroke="var(--sce-icon-muted)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/attendance.svg`. */
export function AttendanceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="12"
          y="10"
          width="32"
          height="44"
          rx="5"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path d="M20 20h16M20 30h10" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <path d="M44 38l6 6 12-14" stroke="var(--sce-icon-accent)" strokeWidth="4" />
        <circle cx="26" cy="44" r="5" stroke="var(--sce-icon-primary)" strokeWidth="3" />
        <path
          d="M20 54c0-6 4-9 6-9s6 3 6 9"
          stroke="var(--sce-icon-muted)"
          strokeWidth="3"
        />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/pitch.svg`. */
export function PitchApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="8"
          y="12"
          width="48"
          height="40"
          rx="4"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path d="M8 32h48" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <circle cx="32" cy="32" r="8" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <rect
          x="8"
          y="22"
          width="8"
          height="20"
          rx="1"
          stroke="var(--sce-icon-muted)"
          strokeWidth="2.5"
        />
        <rect
          x="48"
          y="22"
          width="8"
          height="20"
          rx="1"
          stroke="var(--sce-icon-muted)"
          strokeWidth="2.5"
        />
        <path d="M32 12v4M32 48v4" stroke="var(--sce-icon-accent)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/dressing-room.svg`. */
export function DressingRoomApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="10"
          y="8"
          width="44"
          height="48"
          rx="5"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path d="M32 8v48" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <circle cx="22" cy="32" r="3" stroke="var(--sce-icon-accent)" strokeWidth="3" />
        <path
          d="M16 18h12M16 46h12M40 18v28"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <path
          d="M36 22h12M36 32h8M36 42h10"
          stroke="var(--sce-icon-muted)"
          strokeWidth="3"
        />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/organisation.svg`. */
export function OrganisationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="26"
          y="8"
          width="12"
          height="12"
          rx="3"
          stroke="var(--sce-icon-accent)"
          strokeWidth="3.5"
        />
        <path d="M32 20v8M16 28h32" stroke="var(--sce-icon-secondary)" strokeWidth="3.5" />
        <path
          d="M16 28v8M32 28v8M48 28v8"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3.5"
        />
        <rect
          x="8"
          y="36"
          width="16"
          height="12"
          rx="3"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <rect
          x="24"
          y="36"
          width="16"
          height="12"
          rx="3"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <rect
          x="40"
          y="36"
          width="16"
          height="12"
          rx="3"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <path d="M8 54h48" stroke="var(--sce-icon-muted)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/org-unit.svg`. */
export function OrgUnitApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="20"
          y="10"
          width="24"
          height="14"
          rx="3"
          stroke="var(--sce-icon-accent)"
          strokeWidth="3.5"
        />
        <path
          d="M32 24v10M32 34h-14M32 34h14"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3.5"
        />
        <rect
          x="8"
          y="34"
          width="20"
          height="16"
          rx="3"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3.5"
        />
        <rect
          x="36"
          y="34"
          width="20"
          height="16"
          rx="3"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3.5"
        />
        <path d="M18 50v4M46 50v4" stroke="var(--sce-icon-muted)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/people.svg`. */
export function PeopleApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="22" r="7" stroke="var(--sce-icon-primary)" strokeWidth="3.5" />
        <circle cx="42" cy="26" r="6" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <path
          d="M10 50c0-10 8-14 14-14s14 4 14 14"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3.5"
        />
        <path d="M36 50c0-8 5-11 10-11" stroke="var(--sce-icon-muted)" strokeWidth="3" />
        <path d="M24 36h4" stroke="var(--sce-icon-accent)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/roles-access.svg`. */
export function RolesAccessApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M32 10l14 6v12c0 10-6 16-14 20-8-4-14-10-14-20V16z"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3.5"
        />
        <circle cx="32" cy="24" r="5" stroke="var(--sce-icon-accent)" strokeWidth="3" />
        <path d="M32 29v5" stroke="var(--sce-icon-accent)" strokeWidth="3" />
        <path
          d="M44 38c4 4 8 10 8 16H12c0-6 4-12 8-16"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
        <path
          d="M46 46l10 10M52 46l-6 6"
          stroke="var(--sce-icon-accent)"
          strokeWidth="3.5"
        />
        <circle cx="52" cy="40" r="4" stroke="var(--sce-icon-primary)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/club.svg`. */
export function ClubApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M32 8l18 8v14c0 12-8 20-18 26-10-6-18-14-18-26V16z"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path
          d="M32 16v32M22 26h20M24 36h16"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
        <circle cx="32" cy="26" r="4" stroke="var(--sce-icon-accent)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/documents.svg`. */
export function DocumentsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M18 12h22l8 8v34H18z"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path d="M40 12v8h8" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <path
          d="M24 28h20M24 36h16M24 44h12"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
        <rect
          x="10"
          y="18"
          width="26"
          height="34"
          rx="3"
          stroke="var(--sce-icon-muted)"
          strokeWidth="3"
        />
        <path d="M16 28h14M16 36h10" stroke="var(--sce-icon-muted)" strokeWidth="2.5" />
        <circle cx="46" cy="46" r="6" stroke="var(--sce-icon-accent)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/tasks.svg`. */
export function TasksApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="12"
          y="10"
          width="40"
          height="44"
          rx="5"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path
          d="M22 24l4 4 8-8M22 38l4 4 8-8M22 52h20"
          stroke="var(--sce-icon-accent)"
          strokeWidth="3.5"
        />
        <rect
          x="38"
          y="48"
          width="10"
          height="10"
          rx="2"
          stroke="var(--sce-icon-secondary)"
          strokeWidth="3"
        />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/requirements.svg`. */
export function RequirementsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M16 12h24l8 8v32H16z"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path d="M40 12v8h8M12 22h32" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <path
          d="M22 30h20M22 38h20M22 46h14"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3"
        />
        <path d="M46 42l6 6 12-14" stroke="var(--sce-icon-accent)" strokeWidth="4" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/events.svg`. */
export function EventsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect
          x="10"
          y="14"
          width="44"
          height="42"
          rx="6"
          stroke="var(--sce-icon-primary)"
          strokeWidth="4"
        />
        <path d="M10 26h44M22 8v12M42 8v12" stroke="var(--sce-icon-primary)" strokeWidth="4" />
        <path d="M32 32l4 8h-8z" stroke="var(--sce-icon-accent)" strokeWidth="3.5" />
        <circle cx="32" cy="32" r="10" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/communication.svg`. */
export function CommunicationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M10 16h32a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H26l-8 8v-8H10a4 4 0 0 1-4-4V20a4 4 0 0 1 4-4z"
          stroke="var(--sce-icon-primary)"
          strokeWidth="3.5"
        />
        <path d="M24 24h16M24 32h10" stroke="var(--sce-icon-secondary)" strokeWidth="3" />
        <path
          d="M38 34h16a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H44l-6 6v-6H38a3 3 0 0 1-3-3V37a3 3 0 0 1 3-3z"
          stroke="var(--sce-icon-accent)"
          strokeWidth="3"
        />
        <path d="M44 42h8" stroke="var(--sce-icon-muted)" strokeWidth="2.5" />
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
