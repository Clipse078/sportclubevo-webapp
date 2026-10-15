"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { cn } from "@/lib/cn";
import { SCE_CALENDAR_MICRO_VISUAL } from "@/lib/calendar/sce-calendar-engine/calendar-micro-visual-tokens";
import type { ProgrammeCalendarMicroEntry as ProgrammeCalendarMicroEntryModel } from "@/lib/programme-engine/programme-calendar-presentation";

type Props = {
  entry: ProgrammeCalendarMicroEntryModel;
};

export function ProgrammeCalendarMicroEntry({ entry }: Props) {
  return (
    <Link
      href={entry.href}
      className={cn(
        "group/micro relative z-[1] block min-w-0 rounded border px-0.5 py-px text-left leading-tight",
        "pointer-events-auto transition-colors hover:brightness-110",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]",
        entry.chipTintClass,
        entry.chipBorderClass,
        entry.cancelled && "opacity-60 line-through decoration-[var(--muted)]",
      )}
      aria-label={`${entry.accessibleLabel} — Details öffnen`}
      data-testid={`programme-calendar-entry-${entry.id}`}
      data-programme-palette={entry.paletteKey}
      data-programme-kind={entry.kind}
    >
      <span
        className={cn(
          "block truncate text-[0.5rem] font-bold uppercase tracking-wide",
          entry.chipTextClass,
        )}
      >
        {entry.typeLabel}
      </span>
      {entry.visualIdentity?.kind === "CLUB_CREST" ? (
        <span
          className="flex min-w-0 items-center gap-0.5"
          data-testid="sce-calendar-micro-identity"
        >
          <ClubCrest
            identity={entry.visualIdentity.identity}
            density="micro"
            decorative
            className="shrink-0"
          />
          <span className="min-w-0 truncate text-[0.5625rem] font-semibold text-[var(--foreground)]">
            {entry.identityLabel ?? entry.title}
          </span>
        </span>
      ) : (
        <span
          className="block truncate text-[0.5625rem] font-semibold text-[var(--foreground)]"
          data-testid="sce-calendar-micro-identity"
        >
          {entry.identityLabel ?? entry.title}
        </span>
      )}
      <span className={SCE_CALENDAR_MICRO_VISUAL.metaRowClass} data-testid="sce-calendar-micro-time">
        <Clock className={SCE_CALENDAR_MICRO_VISUAL.metaIconClass} aria-hidden />
        <span className={SCE_CALENDAR_MICRO_VISUAL.timeClass}>{entry.timeLabel}</span>
      </span>
      {(entry.locationLabel ?? entry.contextLine) ? (
        <span
          className={SCE_CALENDAR_MICRO_VISUAL.locationRowClass}
          data-testid="sce-calendar-micro-location"
        >
          <MapPin className={SCE_CALENDAR_MICRO_VISUAL.metaIconClass} aria-hidden />
          <span className={SCE_CALENDAR_MICRO_VISUAL.locationTextClass}>
            {entry.locationLabel ?? entry.contextLine}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
