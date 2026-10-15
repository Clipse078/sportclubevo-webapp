"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
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
      <span className="block truncate font-mono text-[0.5625rem] tabular-nums text-[var(--foreground)]">
        {entry.timeLabel}
      </span>
      <span className="block truncate text-[0.5625rem] font-medium text-[var(--foreground)]">
        {entry.title}
      </span>
      {entry.contextLine ? (
        <span className="block truncate text-[0.5rem] text-[var(--text-2)]">{entry.contextLine}</span>
      ) : null}
    </Link>
  );
}
