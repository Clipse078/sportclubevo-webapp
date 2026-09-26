import { resolveSceIconPixelSize, type SceIconGlyphProps } from "../../SceIcon.types";
import { IconCircle, IconLine, IconPath, SceIconSvg } from "../../SceIconSvg";

function px(size: SceIconGlyphProps["size"]) {
  return resolveSceIconPixelSize(size);
}

export function MessageGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconPath d="M5 6h14a1 1 0 011 1v8a1 1 0 01-1 1H9l-4 3v-3H5a1 1 0 01-1-1V7a1 1 0 011-1z" role="primary" />
      <IconLine x1="8" y1="10" x2="16" y2="10" role="secondary" />
      <IconLine x1="8" y1="13" x2="13" y2="13" role="muted" />
    </SceIconSvg>
  );
}

export function NotificationGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconPath d="M6 10a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" role="primary" />
      <IconPath d="M10 18a2 2 0 004 0" role="secondary" />
      <IconCircle cx="17" cy="7" r="2" role="accent" fill="var(--sce-icon-accent)" />
    </SceIconSvg>
  );
}

export function DocumentGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconPath d="M8 4h6l4 4v12H8V4z" role="primary" />
      <IconPath d="M14 4v4h4" role="secondary" />
      <IconLine x1="10" y1="12" x2="16" y2="12" role="muted" />
      <IconLine x1="10" y1="15" x2="15" y2="15" role="muted" />
      <IconLine x1="10" y1="18" x2="14" y2="18" role="accent" />
    </SceIconSvg>
  );
}
