import { resolveSceIconPixelSize, type SceIconGlyphProps } from "../../SceIcon.types";
import { IconCircle, IconLine, IconRect, SceIconSvg } from "../../SceIconSvg";
import { SCE_APPROVED_HERO_VIEWBOX } from "../../masters/approved-hero-meta";

function px(size: SceIconGlyphProps["size"]) {
  return resolveSceIconPixelSize(size);
}

/** Monochrome programme/calendar — navigation-safe (currentColor only). */
export function CalendarGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg
      size={px(size)}
      viewBox={SCE_APPROVED_HERO_VIEWBOX}
      className={className}
      title={title}
      monochrome
    >
      <g strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="14" width="46" height="42" rx="6" stroke="currentColor" strokeWidth="4" />
        <path d="M9 25h46M20 8v14M44 8v14" stroke="currentColor" strokeWidth="4" />
        <path
          d="M17 33h6M29 33h6M41 33h6M17 43h6M29 43h6M41 43h6"
          stroke="currentColor"
          strokeWidth="3"
        />
      </g>
    </SceIconSvg>
  );
}

export function EventGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconRect x="5" y="4" width="14" height="16" rx="2" role="primary" />
      <IconLine x1="8" y1="9" x2="16" y2="9" role="secondary" />
      <IconLine x1="8" y1="13" x2="14" y2="13" role="muted" />
      <IconCircle cx="16" cy="16" r="1.5" role="accent" fill="var(--sce-icon-accent)" />
    </SceIconSvg>
  );
}
