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

/** Geometry copied exactly from `public/images/icons/analytics.svg`. */
export function AnalyticsApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 52h44M15 46V32M27 46V23M39 46V35M51 46V14" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M15 25l12-9 12 10 12-17" stroke="var(--sce-icon-secondary)" strokeWidth="4"/>
        <circle cx="51" cy="9" r="4" fill="var(--sce-icon-accent)"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/approval.svg`. */
export function ApprovalApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 7l20 8v15c0 13-8 22-20 27-12-5-20-14-20-27V15l20-8z" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M22 31l7 7 14-16" stroke="var(--sce-icon-accent)" strokeWidth="4"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/archive.svg`. */
export function ArchiveApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 18h44v35H10V18z" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M7 10h50v12H7V10zM24 31h16" stroke="var(--sce-icon-secondary)" strokeWidth="4"/>
        <path d="M28 41h8" stroke="var(--sce-icon-accent)" strokeWidth="4"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/automation.svg`. */
export function AutomationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="32" r="10" stroke="var(--sce-icon-accent)" strokeWidth="4"/>
        <path d="M32 7v8M32 49v8M7 32h8M49 32h8M14 14l6 6M44 44l6 6M50 14l-6 6M20 44l-6 6" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M32 24v8l6 4" stroke="var(--sce-icon-secondary)" strokeWidth="3"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/export.svg`. */
export function ExportApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 48v8h40v-8M32 40V9M22 19L32 9l10 10" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M19 47h26" stroke="var(--sce-icon-secondary)" strokeWidth="4"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/form.svg`. */
export function FormApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="13" y="8" width="38" height="48" rx="5" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <rect x="20" y="19" width="6" height="6" rx="1" stroke="var(--sce-icon-accent)" strokeWidth="3"/>
        <path d="M32 22h11M20 34h23M20 43h23" stroke="var(--sce-icon-secondary)" strokeWidth="3"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/history.svg`. */
export function HistoryApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 20V9M14 9H25M14 9l7 7" stroke="var(--sce-icon-accent)" strokeWidth="4"/>
        <path d="M15 18c5-8 13-12 22-10 12 3 20 15 17 27S39 55 27 52C18 50 11 43 9 34" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M32 19v14l10 6" stroke="var(--sce-icon-secondary)" strokeWidth="4"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/import.svg`. */
export function ImportApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 48v8h40v-8M32 8v31M22 29l10 10 10-10" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M19 47h26" stroke="var(--sce-icon-secondary)" strokeWidth="4"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/insight.svg`. */
export function InsightApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 39c-5-4-8-9-8-15 0-10 8-18 19-18s19 8 19 18c0 6-3 11-8 15-3 2-4 5-4 8H25c0-3-1-6-4-8z" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M25 53h14M27 47h10" stroke="var(--sce-icon-secondary)" strokeWidth="3"/>
        <path d="M32 17v13M26 24h12" stroke="var(--sce-icon-accent)" strokeWidth="4"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/integration.svg`. */
export function IntegrationApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 18h-7a8 8 0 0 0-8 8v12a8 8 0 0 0 8 8h7M40 18h7a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-7" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M22 32h20" stroke="var(--sce-icon-secondary)" strokeWidth="4"/>
        <path d="M36 26l6 6-6 6" stroke="var(--sce-icon-accent)" strokeWidth="4"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/report.svg`. */
export function ReportApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 8h29l8 8v40H14V8z" stroke="var(--sce-icon-primary)" strokeWidth="4"/>
        <path d="M43 8v10h8M22 43V33M31 43V25M40 43V29" stroke="var(--sce-icon-secondary)" strokeWidth="3"/>
        <path d="M22 49h18" stroke="var(--sce-icon-accent)" strokeWidth="3"/>
      </g>
    </SceIconSvg>
  );
}

/** Geometry copied exactly from `public/images/icons/workflow.svg`. */
export function WorkflowApprovedMasterGlyph(props: ApprovedMasterGlyphProps) {
  return (
    <SceIconSvg {...masterSvgProps(props)}>
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="7" y="10" width="16" height="12" rx="3" stroke="var(--sce-icon-primary)" strokeWidth="3"/>
        <rect x="41" y="26" width="16" height="12" rx="3" stroke="var(--sce-icon-secondary)" strokeWidth="3"/>
        <rect x="7" y="42" width="16" height="12" rx="3" stroke="var(--sce-icon-primary)" strokeWidth="3"/>
        <path d="M23 16h9c6 0 9 4 9 10M41 38c0 7-3 10-9 10h-9" stroke="var(--sce-icon-secondary)" strokeWidth="3"/>
        <path d="M36 21l5 5 5-5M28 43l-5 5 5 5" stroke="var(--sce-icon-accent)" strokeWidth="3"/>
      </g>
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
