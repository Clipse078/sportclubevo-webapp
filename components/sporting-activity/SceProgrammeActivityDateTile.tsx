"use client";

import { cn } from "@/lib/cn";
import {
  formatProgrammeActivityDateTileParts,
  type ProgrammeActivityDateTileParts,
} from "@/lib/sporting-activity-presentation/canonical/programme-activity-date-tile";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type SceProgrammeActivityDateTileProps = {
  startAt: Date;
  fmtCfg: TenantFormatConfig;
  className?: string;
  testId?: string;
  /** Precomputed parts avoid duplicate Intl work in lists. */
  parts?: ProgrammeActivityDateTileParts;
};

/**
 * Compact programme date tile — aligned with dashboard Veranstaltungen list rows.
 */
export function SceProgrammeActivityDateTile({
  startAt,
  fmtCfg,
  className,
  testId = "sce-programme-activity-date-tile",
  parts: partsProp,
}: SceProgrammeActivityDateTileProps) {
  const parts = partsProp ?? formatProgrammeActivityDateTileParts(startAt, fmtCfg);

  return (
    <div
      className={cn(
        "flex w-[4.75rem] shrink-0 flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1.5 text-center",
        className,
      )}
      aria-hidden
      data-testid={testId}
      data-sce-activity-date-block="date-only"
      data-sce-programme-date-tile
    >
      <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {parts.weekdayShort}
      </span>
      <span
        className="text-xl font-bold leading-none text-[var(--foreground)]"
        style={{ fontFamily: "var(--font-display)" }}
        data-testid="sce-programme-date-tile-day"
        data-sce-programme-date-tile-day
      >
        {parts.day}
      </span>
      <span className="text-[0.6rem] font-semibold uppercase text-[var(--text-2)]">
        {parts.monthShort}
      </span>
    </div>
  );
}
