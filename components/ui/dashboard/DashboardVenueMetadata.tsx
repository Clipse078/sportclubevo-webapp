import { DoorOpen, MapPin, RectangleHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TodayEventVenueGroup } from "@/lib/dashboard/event-venue-presentation";

const GROUP_ICONS = {
  location: MapPin,
  pitch: RectangleHorizontal,
  "dressing-rooms": DoorOpen,
} as const;

export type DashboardVenueMetadataProps = {
  groups: TodayEventVenueGroup[];
  className?: string;
  compact?: boolean;
};

export function DashboardVenueMetadata({
  groups,
  className,
  compact = false,
}: DashboardVenueMetadataProps) {
  if (groups.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5",
        compact ? "text-[0.6875rem]" : "text-[0.75rem]",
        className,
      )}
    >
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.kind];
        return (
          <span
            key={`${group.kind}-${group.label}`}
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[var(--text-2)]"
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
              aria-hidden="true"
            />
            <span className="truncate leading-snug">{group.label}</span>
          </span>
        );
      })}
    </div>
  );
}
