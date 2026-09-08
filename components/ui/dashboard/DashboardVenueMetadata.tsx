import { DoorOpen, MapPin, RectangleHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TodayEventVenueGroup } from "@/lib/dashboard/event-venue-presentation";

const GROUP_ICONS = {
  location: MapPin,
  pitch: RectangleHorizontal,
  "dressing-rooms": DoorOpen,
} as const;

const GROUP_ICON_TREATMENTS: Record<
  TodayEventVenueGroup["kind"],
  { iconClassName: string; containerClassName?: string }
> = {
  location: {
    iconClassName: "text-[var(--muted)]",
  },
  pitch: {
    iconClassName: "text-[var(--sce-success)]",
    containerClassName:
      "bg-[var(--sce-success-light)] text-[var(--sce-success)]",
  },
  "dressing-rooms": {
    iconClassName: "text-[var(--sce-info)]",
    containerClassName: "bg-[var(--sce-info-light)] text-[var(--sce-info)]",
  },
};

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
        const treatment = GROUP_ICON_TREATMENTS[group.kind];

        return (
          <span
            key={`${group.kind}-${group.label}`}
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[var(--text-2)]"
          >
            <span
              className={cn(
                "inline-flex shrink-0 items-center justify-center",
                treatment.containerClassName
                  ? cn(
                      "h-5 w-5 rounded-[var(--radius-sm)]",
                      treatment.containerClassName,
                    )
                  : null,
              )}
              aria-hidden="true"
            >
              <Icon
                className={cn(
                  "shrink-0",
                  treatment.containerClassName ? "h-3 w-3" : "h-3.5 w-3.5",
                  treatment.iconClassName,
                )}
                aria-hidden="true"
              />
            </span>
            <span className="truncate leading-snug">{group.label}</span>
          </span>
        );
      })}
    </div>
  );
}
