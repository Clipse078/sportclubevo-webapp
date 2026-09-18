"use client";

/**
 * Aggregate cluster inspection entry — opens the full-screen operational dialog.
 * (Replaces the former narrow popover list.)
 */

import AggregatedActivityInspectionDialog from "./AggregatedActivityInspectionDialog";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type Props = {
  open: boolean;
  onClose: () => void;
  items: WeekplannerItem[];
  dayKey: string;
  locale: string;
  timezone: string;
  onOpenItem: (item: WeekplannerItem) => void;
  onEditItem?: (item: WeekplannerItem) => void;
  canEditItem?: (item: WeekplannerItem) => boolean;
};

export default function PlanningHubClusterInspector({
  open,
  onClose,
  items,
  dayKey,
  locale,
  timezone,
  onOpenItem,
  onEditItem,
  canEditItem,
}: Props) {
  return (
    <AggregatedActivityInspectionDialog
      open={open}
      onClose={onClose}
      items={items}
      dayKey={dayKey}
      locale={locale}
      timezone={timezone}
      onOpenItem={onOpenItem}
      onEditItem={onEditItem}
      canEditItem={canEditItem}
    />
  );
}
