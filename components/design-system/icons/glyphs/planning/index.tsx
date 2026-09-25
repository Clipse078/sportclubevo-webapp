import { SCE_ICON_SIZES, type SceIconGlyphProps } from "../../SceIcon.types";
import { IconCircle, IconLine, IconPath, IconRect, SceIconSvg } from "../../SceIconSvg";

function px(size: SceIconGlyphProps["size"]) {
  return SCE_ICON_SIZES[size ?? 24];
}

export function DashboardGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconRect x="4" y="4" width="7" height="7" rx="2" role="primary" />
      <IconRect x="13" y="4" width="7" height="7" rx="2" role="secondary" />
      <IconRect x="4" y="13" width="7" height="7" rx="2" role="primary" />
      <IconRect x="13" y="13" width="7" height="7" rx="2" role="accent" />
    </SceIconSvg>
  );
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

export function WeekPlannerGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconRect x="3" y="5" width="18" height="15" rx="2" role="primary" />
      <IconLine x1="3" y1="9" x2="21" y2="9" role="secondary" />
      <IconLine x1="8" y1="9" x2="8" y2="20" role="muted" />
      <IconLine x1="12" y1="9" x2="12" y2="20" role="muted" />
      <IconLine x1="16" y1="9" x2="16" y2="20" role="muted" />
      <IconRect x="9" y="12" width="2.5" height="3" rx="0.5" role="accent" />
      <IconRect x="13" y="15" width="2.5" height="3" rx="0.5" role="primary" />
    </SceIconSvg>
  );
}

export function TrainingGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconPath d="M4 18h16" role="secondary" />
      <IconPath d="M6 18V8l6-4 6 4v10" role="primary" />
      <IconPath d="M9 12h2l1.5 3H12" role="accent" />
      <IconCircle cx="16" cy="11" r="1.25" role="accent" fill="var(--sce-icon-accent)" />
      <IconPath d="M12 4v3" role="muted" />
    </SceIconSvg>
  );
}

export function MatchGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconCircle cx="12" cy="12" r="7" role="primary" />
      <IconPath d="M12 5l2.2 4.5L12 12l-2.2-2.5L12 5z" role="secondary" />
      <IconPath d="M12 19l-2.2-4.5L12 12l2.2 2.5L12 19z" role="secondary" />
      <IconPath d="M5 12h4.5L12 12H5z" role="accent" />
      <IconPath d="M19 12h-4.5L12 12h7z" role="primary" />
    </SceIconSvg>
  );
}

export function TournamentGlyph({ className, size = 24, title }: SceIconGlyphProps) {
  return (
    <SceIconSvg size={px(size)} className={className} title={title}>
      <IconPath d="M8 6h8l-1 4.5H9L8 6z" role="primary" />
      <IconPath d="M7 10.5h10v2c0 2-2.2 3.5-5 3.5S7 14.5 7 12.5v-2z" role="secondary" />
      <IconLine x1="12" y1="16" x2="12" y2="19" role="primary" />
      <IconLine x1="9" y1="19" x2="15" y2="19" role="primary" />
      <IconPath d="M4 8v2M4 8h3M20 8v2M20 8h-3" role="accent" />
      <IconPath d="M4 10h3v2c0 1.5-1.5 2.5-3 2.5V10z" role="muted" />
      <IconPath d="M20 10h-3v2c0 1.5 1.5 2.5 3 2.5V10z" role="muted" />
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
