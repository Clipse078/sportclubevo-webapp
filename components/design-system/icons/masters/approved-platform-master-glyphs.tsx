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
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="4"/><path d="M32 18v18" stroke="currentColor" strokeWidth="5"/><circle cx="32" cy="45" r="3" fill="currentColor"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/audit.svg` (V2 monochrome artwork). */
export function AuditApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="12" y="8" width="34" height="46" rx="5" stroke="currentColor" strokeWidth="4"/><path d="M20 20h18M20 29h14M20 38h10" stroke="currentColor" strokeWidth="3.5"/><circle cx="43" cy="42" r="8" stroke="currentColor" strokeWidth="4"/><path d="M49 48l6 6" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/billing-invoice.svg` (V2 monochrome artwork). */
export function BillingInvoiceApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M15 8h27l8 8v40l-5-3-5 3-5-3-5 3-5-3-5 3-5-3z" stroke="currentColor" strokeWidth="4"/><path d="M42 8v10h8" stroke="currentColor" strokeWidth="4"/><path d="M23 27h18M23 36h12" stroke="currentColor" strokeWidth="3.5"/><circle cx="41" cy="42" r="7" stroke="currentColor" strokeWidth="4"/><path d="M38 42h6" stroke="currentColor" strokeWidth="3"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/conflict.svg` (V2 monochrome artwork). */
export function ConflictApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 8l25 44H7z" stroke="currentColor" strokeWidth="4"/><path d="M32 22v15" stroke="currentColor" strokeWidth="5"/><circle cx="32" cy="45" r="2.5" fill="currentColor"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/infoboard.svg` (V2 monochrome artwork). */
export function InfoboardApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="8" y="11" width="48" height="34" rx="5" stroke="currentColor" strokeWidth="4"/><path d="M23 53h18M28 45v8M36 45v8" stroke="currentColor" strokeWidth="4"/><path d="M17 21h14M17 29h23" stroke="currentColor" strokeWidth="3.5"/><circle cx="46" cy="31" r="6" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/news.svg` (V2 monochrome artwork). */
export function NewsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="10" y="12" width="44" height="40" rx="6" stroke="currentColor" strokeWidth="4"/><path d="M18 22h18M18 31h28M18 40h18" stroke="currentColor" strokeWidth="4"/><path d="M43 18h5v7h-5z" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/notifications.svg` (V2 monochrome artwork). */
export function NotificationsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M17 43h30l-4-6V27c0-8-5-14-11-14s-11 6-11 14v10z" stroke="currentColor" strokeWidth="4"/><path d="M27 49c1 4 3 6 5 6s4-2 5-6" stroke="currentColor" strokeWidth="4"/><circle cx="47" cy="16" r="6" fill="currentColor"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/planning.svg` (V2 monochrome artwork). */
export function PlanningApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="10" y="12" width="44" height="42" rx="6" stroke="currentColor" strokeWidth="4"/><path d="M10 24h44M21 8v9M43 8v9" stroke="currentColor" strokeWidth="4"/><path d="M20 34h10M20 43h16" stroke="currentColor" strokeWidth="3.5"/><path d="M42 32v13M36 38h12" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/publish.svg` (V2 monochrome artwork). */
export function PublishApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 43V12M20 24l12-12 12 12" stroke="currentColor" strokeWidth="5"/><path d="M14 36v13c0 3 2 5 5 5h26c3 0 5-2 5-5V36" stroke="currentColor" strokeWidth="4"/><path d="M23 35h18" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/resource-allocation.svg` (V2 monochrome artwork). */
export function ResourceAllocationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="9" y="12" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="4"/><rect x="37" y="36" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="4"/><path d="M27 20h10c7 0 10 4 10 10v6M37 44H27c-7 0-10-4-10-10v-6" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/settings.svg` (V2 monochrome artwork). */
export function SettingsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 16L35.95 9.34L45.23 13.18L43.31 20.69L50.82 18.77L54.66 28.05L48 32L54.66 35.95L50.82 45.23L43.31 43.31L45.23 50.82L35.95 54.66L32 48L28.05 54.66L18.77 50.82L20.69 43.31L13.18 45.23L9.34 35.95L16 32L9.34 28.05L13.18 18.77L20.69 20.69L18.77 13.18L28.05 9.34Z" stroke="currentColor" strokeWidth="4"/><circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="4"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/website.svg` (V2 monochrome artwork). */
export function WebsiteApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="4"/><path d="M10 32h44M32 10c7 7 10 14 10 22s-3 15-10 22M32 10c-7 7-10 14-10 22s3 15 10 22" stroke="currentColor" strokeWidth="3.5"/><path d="M17 20h30" stroke="currentColor" strokeWidth="4"/>
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
