import { SCE_ICON_SIZES, type SceIconGlyphProps } from "../../SceIcon.types";
import { MonoCircle, MonoLine, MonoPath, SceIconSvg } from "../../SceIconSvg";

function px(size: SceIconGlyphProps["size"]) {
  return SCE_ICON_SIZES[size ?? 24];
}

export function SearchGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <MonoCircle cx="11" cy="11" r="5.5" />
      <MonoLine x1="15" y1="15" x2="19" y2="19" />
    </SceIconSvg>
  );
}

export function SettingsGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <MonoCircle cx="12" cy="12" r="2.5" />
      <MonoPath d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
    </SceIconSvg>
  );
}

export function ProfileGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <MonoCircle cx="12" cy="9" r="3.5" />
      <MonoPath d="M6 20c0-3.5 2.7-6 6-6s6 2.5 6 6" />
    </SceIconSvg>
  );
}

export function AddGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <MonoLine x1="12" y1="6" x2="12" y2="18" />
      <MonoLine x1="6" y1="12" x2="18" y2="12" />
    </SceIconSvg>
  );
}

export function EditGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <MonoPath d="M5 19h3l9-9-3-3-9 9v3z" />
      <MonoPath d="M14 5l3 3" />
    </SceIconSvg>
  );
}

export function CloseGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <MonoLine x1="7" y1="7" x2="17" y2="17" />
      <MonoLine x1="17" y1="7" x2="7" y2="17" />
    </SceIconSvg>
  );
}

export function MoreGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <circle cx="6" cy="12" r="1.25" fill="currentColor" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
      <circle cx="18" cy="12" r="1.25" fill="currentColor" />
    </SceIconSvg>
  );
}
