import { SCE_ICON_SIZES, type SceIconGlyphProps } from "../../SceIcon.types";
import { IconCircle, IconLine, IconPath, IconRect, SceIconSvg } from "../../SceIconSvg";

function px(size: SceIconGlyphProps["size"]) {
  return SCE_ICON_SIZES[size ?? 24];
}

export function MembersGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconCircle cx="9" cy="9" r="3" role="primary" />
      <IconPath d="M4 19c0-3 2.2-5 5-5s5 2 5 5" role="secondary" />
      <IconCircle cx="16" cy="10" r="2.5" role="muted" />
      <IconPath d="M14 19c.3-2.2 1.8-3.5 4-3.5" role="muted" />
    </SceIconSvg>
  );
}

export function TeamGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconCircle cx="8" cy="10" r="2.5" role="primary" />
      <IconCircle cx="16" cy="10" r="2.5" role="primary" />
      <IconCircle cx="12" cy="7" r="2.5" role="secondary" />
      <IconPath d="M5 18c0-2.5 2-4 3.5-4M19 18c0-2.5-2-4-3.5-4" role="muted" />
      <IconPath d="M9.5 14c.8 1.5 2.2 2 2.5 2s1.7-.5 2.5-2" role="accent" />
    </SceIconSvg>
  );
}

export function OrganisationGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconRect x="10" y="4" width="4" height="4" rx="1" role="accent" />
      <IconLine x1="12" y1="8" x2="12" y2="11" role="primary" />
      <IconLine x1="6" y1="11" x2="18" y2="11" role="secondary" />
      <IconLine x1="8" y1="11" x2="8" y2="18" role="primary" />
      <IconLine x1="12" y1="11" x2="12" y2="18" role="primary" />
      <IconLine x1="16" y1="11" x2="16" y2="18" role="primary" />
      <IconLine x1="5" y1="18" x2="19" y2="18" role="muted" />
    </SceIconSvg>
  );
}

export function RoleGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconPath d="M6 8h12v10H6V8z" role="primary" />
      <IconPath d="M9 8V6a3 3 0 016 0v2" role="secondary" />
      <IconCircle cx="12" cy="13" r="2" role="accent" />
      <IconLine x1="12" y1="15" x2="12" y2="16.5" role="muted" />
    </SceIconSvg>
  );
}

export function FinanceGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconRect x="4" y="6" width="16" height="12" rx="2" role="primary" />
      <IconLine x1="4" y1="10" x2="20" y2="10" role="secondary" />
      <IconPath d="M8 14h2M14 14h2" role="muted" />
      <IconCircle cx="12" cy="14" r="1.25" role="accent" fill="var(--sce-icon-accent)" />
    </SceIconSvg>
  );
}
