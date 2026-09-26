import { resolveSceIconPixelSize, type SceIconGlyphProps } from "../../SceIcon.types";
import { IconCircle, IconLine, IconRect, SceIconSvg } from "../../SceIconSvg";

function px(size: SceIconGlyphProps["size"]) {
  return resolveSceIconPixelSize(size);
}

export function CalendarGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconRect x="4" y="5" width="16" height="15" rx="2" role="primary" />
      <IconLine x1="4" y1="9" x2="20" y2="9" role="secondary" />
      <IconLine x1="8" y1="3" x2="8" y2="7" role="primary" />
      <IconLine x1="16" y1="3" x2="16" y2="7" role="primary" />
      <IconCircle cx="12" cy="14" r="1.5" role="accent" fill="var(--sce-icon-accent)" />
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
