"use client";

import { SceIcon } from "@/components/design-system/icons/SceIcon";
import type { SceIconSize } from "@/components/design-system/icons/SceIcon.types";
import { getActivitySceIconName } from "@/lib/planning/activity-sce-icon";
import { cn } from "@/lib/cn";

export type ActivitySceIconProps = {
  /** Canonical domain activity kind (TRAINING | MATCH | TOURNAMENT). */
  activityKind: string;
  size?: SceIconSize | number;
  className?: string;
};

/**
 * Operational activity identity via approved SCE masters (SCE-ICONS-03).
 * Decorative by default; activity type remains in adjacent text.
 */
export function ActivitySceIcon({
  activityKind,
  size = 16,
  className,
}: ActivitySceIconProps) {
  const sceName = getActivitySceIconName(activityKind);
  if (!sceName) {
    return null;
  }

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      aria-hidden
      data-sce-activity-icon={sceName}
      data-sce-activity-kind={activityKind}
    >
      <SceIcon name={sceName} size={size} />
    </span>
  );
}
