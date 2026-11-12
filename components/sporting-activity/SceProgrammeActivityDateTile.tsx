"use client";

import { SceDateTile } from "@/components/design-system/date";
import { formatSceDateTileParts } from "@/lib/design-system/sce-date-tile";
import type { ProgrammeActivityDateTileParts } from "@/lib/sporting-activity-presentation/canonical/programme-activity-date-tile";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type { ProgrammeActivityDateTileParts };

export type SceProgrammeActivityDateTileProps = {
  startAt: Date;
  fmtCfg: TenantFormatConfig;
  className?: string;
  testId?: string;
  /** Precomputed parts avoid duplicate Intl work in lists. */
  parts?: ProgrammeActivityDateTileParts;
};

/**
 * Programme activity date tile — delegates to canonical {@link SceDateTile}.
 */
export function SceProgrammeActivityDateTile({
  startAt,
  fmtCfg,
  className,
  testId = "sce-programme-activity-date-tile",
  parts: partsProp,
}: SceProgrammeActivityDateTileProps) {
  const resolvedParts = partsProp
    ? { ...partsProp, accessibleLabel: formatSceDateTileParts(startAt, fmtCfg).accessibleLabel }
    : undefined;

  return (
    <SceDateTile
      value={startAt}
      fmtCfg={fmtCfg}
      className={className}
      testId={testId}
      dayTestId="sce-programme-date-tile-day"
      parts={resolvedParts}
      programmeMarker
    />
  );
}
