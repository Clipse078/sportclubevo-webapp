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

/** Geometry copied exactly from `public/images/icons/team.svg` (V2 monochrome artwork). */
export function TeamApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="20" r="8"/><circle cx="16" cy="27" r="6"/><circle cx="48" cy="27" r="6"/><path d="M19 52c1-10 6-16 13-16s12 6 13 16M7 51c1-8 4-13 10-13 3 0 5 1 7 3M57 51c-1-8-4-13-10-13-3 0-5 1-7 3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/season.svg` (V2 monochrome artwork). */
export function SeasonApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="22"/><path d="M32 10a22 22 0 0 1 20 13M52 23l-1-10M52 23l-10-2M32 54a22 22 0 0 1-20-13M12 41l1 10M12 41l10 2M32 21v12l8 6"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/standings.svg` (V2 monochrome artwork). */
export function StandingsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 54h44M14 54V34h10v20M27 54V22h10v32M40 54V12h10v42"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/results.svg` (V2 monochrome artwork). */
export function ResultsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M11 13h42v38H11zM11 24h42M24 13v38M40 13v38"/><path d="M16 32h3M16 41h3M29 32h6M45 32h3M45 41h3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/attendance.svg` (V2 monochrome artwork). */
export function AttendanceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="25" cy="21" r="9"/><path d="M9 51c1-12 7-19 16-19 5 0 9 2 12 6M37 45l6 6 12-15"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/pitch.svg` (V2 monochrome artwork). */
export function PitchApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="7" y="11" width="50" height="42" rx="4"/><path d="M32 11v42"/><circle cx="32" cy="32" r="7"/><path d="M7 23h8v18H7M57 23h-8v18h8"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/dressing-room.svg` (V2 monochrome artwork). */
export function DressingRoomApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="10" y="9" width="44" height="46" rx="5"/><path d="M25 9v46M39 9v46M17 31h1M32 31h1M46 31h1"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/organisation.svg` (V2 monochrome artwork). */
export function OrganisationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="24" y="8" width="16" height="12" rx="3"/><rect x="7" y="44" width="16" height="12" rx="3"/><rect x="24" y="44" width="16" height="12" rx="3"/><rect x="41" y="44" width="16" height="12" rx="3"/><path d="M32 20v12M15 44V32h34v12M32 32v12"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/org-unit.svg` (V2 monochrome artwork). */
export function OrgUnitApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="21" y="8" width="22" height="16" rx="4"/><rect x="8" y="42" width="20" height="14" rx="4"/><rect x="36" y="42" width="20" height="14" rx="4"/><path d="M32 24v9M18 42v-9h28v9"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/people.svg` (V2 monochrome artwork). */
export function PeopleApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="24" cy="21" r="9"/><circle cx="43" cy="25" r="7"/><path d="M7 52c1-13 7-20 17-20s16 7 17 20M38 37c2-2 4-3 7-3 7 0 11 6 12 17"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/roles-access.svg` (V2 monochrome artwork). */
export function RolesAccessApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="25" cy="22" r="8"/><path d="M10 50c1-11 6-18 15-18 5 0 9 2 12 7"/><path d="M40 36h14v15H40zM43 36v-4a4 4 0 0 1 8 0v4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/club.svg` (V2 monochrome artwork). */
export function ClubApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 55h44M15 55V20l17-10 17 10v35M24 55V41h16v14M23 27h4M37 27h4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/documents.svg` (V2 monochrome artwork). */
export function DocumentsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M7 18h20l6 7h24v29H7Z"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/tasks.svg` (V2 monochrome artwork). */
export function TasksApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="9" width="46" height="46" rx="7"/><path d="M18 23l4 4 7-8M18 38l4 4 7-8M34 23h12M34 38h12"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/requirements.svg` (V2 monochrome artwork). */
export function RequirementsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="11" y="9" width="42" height="46" rx="6"/><path d="M20 22h24M20 32h24M20 42h13"/><path d="M16 22h1M16 32h1M16 42h1"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/events.svg` (V2 monochrome artwork). */
export function EventsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="12" width="46" height="43" rx="7"/><path d="M9 24h46M20 8v9M44 8v9"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/communication.svg` (V2 monochrome artwork). */
export function CommunicationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M9 12h46v32H28L17 53v-9H9V12Z"/><path d="M19 24h26M19 33h18"/>
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
