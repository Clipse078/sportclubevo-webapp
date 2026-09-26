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

/** Geometry copied exactly from `public/images/icons/analytics.svg` (V2 monochrome artwork). */
export function AnalyticsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M10 54h44M15 48V34h9v14M28 48V24h9v24M41 48V13h9v35"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/approval.svg` (V2 monochrome artwork). */
export function ApprovalApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M12 33l13 13 28-30"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/archive.svg` (V2 monochrome artwork). */
export function ArchiveApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <rect x="10" y="18" width="44" height="36" rx="4"/><path d="M7 10h50v12H7zM25 33h14"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/automation.svg` (V2 monochrome artwork). */
export function AutomationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="10"/><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/export.svg` (V2 monochrome artwork). */
export function ExportApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 50V16M20 28l12-12 12 12"/><path d="M11 56h42"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/form.svg` (V2 monochrome artwork). */
export function FormApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M16 8h23l11 11v37H16Z"/><path d="M39 8v12h11M23 31h20M23 40h20M23 49h13"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/history.svg` (V2 monochrome artwork). */
export function HistoryApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="32" cy="32" r="22"/><path d="M32 19v14l10 6M13 18H6V9"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/import.svg` (V2 monochrome artwork). */
export function ImportApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M32 8v34M20 30l12 12 12-12"/><path d="M11 50h42"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/insight.svg` (V2 monochrome artwork). */
export function InsightApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M20 28a12 12 0 1 1 24 0c0 7-5 9-7 14H27c-2-5-7-7-7-14Z"/><path d="M27 49h10M29 55h6"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/integration.svg` (V2 monochrome artwork). */
export function IntegrationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M25 18h-7a10 10 0 0 0 0 20h7M39 18h7a10 10 0 0 1 0 20h-7M22 28h20"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/report.svg` (V2 monochrome artwork). */
export function ReportApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <path d="M16 8h23l11 11v37H16Z"/><path d="M39 8v12h11M23 31h20M23 40h20M23 49h13"/>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/workflow.svg` (V2 monochrome artwork). */
export function WorkflowApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)} monochrome>
      <circle cx="13" cy="20" r="5"/><circle cx="51" cy="20" r="5"/><circle cx="32" cy="48" r="5"/><path d="M18 20h28M48 24L35 44M29 44L16 24"/>
    </SceIconSvg>
  );
}

export const SCE_APPROVED_ANALYTICS_WORKFLOW_MASTER_GLYPHS = [
  AnalyticsApprovedMasterGlyph,
  ApprovalApprovedMasterGlyph,
  ArchiveApprovedMasterGlyph,
  AutomationApprovedMasterGlyph,
  ExportApprovedMasterGlyph,
  FormApprovedMasterGlyph,
  HistoryApprovedMasterGlyph,
  ImportApprovedMasterGlyph,
  InsightApprovedMasterGlyph,
  IntegrationApprovedMasterGlyph,
  ReportApprovedMasterGlyph,
  WorkflowApprovedMasterGlyph,
] as const;
