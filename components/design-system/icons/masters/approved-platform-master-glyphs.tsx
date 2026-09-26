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

/** Geometry copied exactly from `public/images/icons/attention.svg` (V2 monochrome artwork). */
export function AttentionApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 8l25 45H7Z"/><path d="M32 23v14M32 45h.1"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/audit.svg` (V2 monochrome artwork). */
export function AuditApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M17 8h30v48H17Z"/><path d="M24 21h16M24 31h16M24 41h8"/><path d="M37 43l4 4 8-9"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/billing-invoice.svg` (V2 monochrome artwork). */
export function BillingInvoiceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M16 8h23l11 11v37H16Z"/><path d="M39 8v12h11M23 31h20M23 40h20M23 49h13"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/conflict.svg` (V2 monochrome artwork). */
export function ConflictApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M14 14l36 36M50 14L14 50"/><circle cx="32" cy="32" r="24"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/infoboard.svg` (V2 monochrome artwork). */
export function InfoboardApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="8" y="10" width="48" height="36" rx="5"/><path d="M24 54h16M32 46v8M17 21h30M17 30h20"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/news.svg` (V2 monochrome artwork). */
export function NewsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M16 8h23l11 11v37H16Z"/><path d="M39 8v12h11M23 31h20M23 40h20M23 49h13"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/notifications.svg` (V2 monochrome artwork). */
export function NotificationsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M18 43h28l-4-6V27c0-8-4-14-10-14s-10 6-10 14v10l-4 6ZM27 49c1 5 9 5 10 0"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/planning.svg` (V2 monochrome artwork). */
export function PlanningApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="12" width="46" height="43" rx="7"/><path d="M9 24h46M20 8v9M44 8v9"/><path d="M19 35l7 7 18-17"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/publish.svg` (V2 monochrome artwork). */
export function PublishApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 54V15M19 28l13-13 13 13"/><path d="M12 42v12h40V42"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/resource-allocation.svg` (V2 monochrome artwork). */
export function ResourceAllocationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="10" width="18" height="18" rx="3"/><rect x="37" y="36" width="18" height="18" rx="3"/><path d="M27 19h16v10M37 45H21V35"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/settings.svg` (V2 monochrome artwork). */
export function SettingsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="8"/><circle cx="32" cy="32" r="18"/><path d="M32 8v7M32 49v7M8 32h7M49 32h7M15 15l5 5M44 44l5 5M49 15l-5 5M20 44l-5 5"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/website.svg` (V2 monochrome artwork). */
export function WebsiteApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="23"/><path d="M9 32h46M32 9c8 7 12 14 12 23S40 48 32 55M32 9c-8 7-12 14-12 23s4 16 12 23"/>
    </SceIconSvg>
  );
}

export const SCE_APPROVED_PLATFORM_MASTER_GLYPHS = [
  AttentionApprovedMasterGlyph,
  AuditApprovedMasterGlyph,
  BillingInvoiceApprovedMasterGlyph,
  ConflictApprovedMasterGlyph,
  InfoboardApprovedMasterGlyph,
  NewsApprovedMasterGlyph,
  NotificationsApprovedMasterGlyph,
  PlanningApprovedMasterGlyph,
  PublishApprovedMasterGlyph,
  ResourceAllocationApprovedMasterGlyph,
  SettingsApprovedMasterGlyph,
  WebsiteApprovedMasterGlyph,
] as const;
