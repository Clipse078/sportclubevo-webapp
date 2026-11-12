"use client";

import { cn } from "@/lib/cn";
import {
  formatSceDateTileParts,
  type SceDateTileParts,
  type SceDateTileValue,
} from "@/lib/design-system/sce-date-tile";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type SceDateTileSize = "default" | "compact";

export type SceDateTileProps = {
  value: SceDateTileValue;
  fmtCfg: TenantFormatConfig;
  size?: SceDateTileSize;
  className?: string;
  testId?: string;
  dayTestId?: string;
  /** Precomputed parts avoid duplicate Intl work in virtualised lists. */
  parts?: SceDateTileParts;
  /** Programme shell marker for governance tests. */
  programmeMarker?: boolean;
  /**
   * When true, the tile is hidden from the accessibility tree (parent exposes the same date).
   */
  decorative?: boolean;
};

const SIZE_CLASS: Record<SceDateTileSize, string> = {
  default: "w-[4.75rem] px-1.5 py-1.5",
  compact: "w-[3.25rem] px-1 py-1.5",
};

const DAY_SIZE_CLASS: Record<SceDateTileSize, string> = {
  default: "text-xl",
  compact: "text-lg",
};

/**
 * Universal DS2 date identity tile — DI / 17 / NOV (locale-driven, uppercase short tokens).
 */
export function SceDateTile({
  value,
  fmtCfg,
  size = "default",
  className,
  testId = "sce-date-tile",
  dayTestId,
  parts: partsProp,
  decorative = false,
  programmeMarker = false,
}: SceDateTileProps) {
  const parts = partsProp ?? formatSceDateTileParts(value, fmtCfg);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-center",
        SIZE_CLASS[size],
        className,
      )}
      data-testid={testId}
      data-sce-date-tile
      data-sce-date-tile-size={size}
      data-sce-programme-date-tile={programmeMarker ? true : undefined}
      data-sce-activity-date-block="date-only"
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : parts.accessibleLabel}
      role={decorative ? undefined : "group"}
    >
      <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {parts.weekdayShort}
      </span>
      <span
        className={cn(
          "font-bold leading-none text-[var(--foreground)]",
          DAY_SIZE_CLASS[size],
        )}
        style={{ fontFamily: "var(--font-display)" }}
        data-testid={dayTestId ?? `${testId}-day`}
        data-sce-date-tile-day
        data-sce-programme-date-tile-day={programmeMarker ? true : undefined}
      >
        {parts.day}
      </span>
      <span className="text-[0.6rem] font-semibold uppercase text-[var(--text-2)]">
        {parts.monthShort}
      </span>
    </div>
  );
}
