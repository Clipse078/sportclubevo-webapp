import { SCE_ICON_SIZES, type SceIconGlyphProps } from "../../SceIcon.types";
import { IconLine, IconPath, IconRect, SceIconSvg } from "../../SceIconSvg";

function px(size: SceIconGlyphProps["size"]) {
  return SCE_ICON_SIZES[size ?? 24];
}

export function WebsiteGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconPath d="M12 3a9 9 0 100 18 9 9 0 000-18z" role="primary" />
      <IconPath d="M3 12h18" role="muted" />
      <IconPath d="M12 3c3 3.5 3 14.5 0 18-3-3.5-3-14.5 0-18z" role="secondary" />
      <IconPath d="M6 8h12M6 16h12" role="primary" />
    </SceIconSvg>
  );
}

export function InfoboardGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconRect x="3" y="5" width="18" height="12" rx="2" role="primary" />
      <IconLine x1="7" y1="10" x2="17" y2="10" role="secondary" />
      <IconLine x1="7" y1="13" x2="14" y2="13" role="muted" />
      <IconLine x1="12" y1="17" x2="12" y2="19" role="primary" />
      <IconLine x1="8" y1="19" x2="16" y2="19" role="primary" />
      <IconRect x="14" y="7" width="4" height="2" rx="0.5" role="accent" />
    </SceIconSvg>
  );
}

export function SponsoringGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconPath d="M6 8h12v8H6V8z" role="primary" />
      <IconPath d="M6 8l6 4 6-4" role="secondary" />
      <IconPath d="M12 12v4" role="muted" />
      <IconPath d="M9 14h6" role="accent" />
    </SceIconSvg>
  );
}
