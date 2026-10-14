"use client";

import { SceIcon } from "@/components/design-system/icons/SceIcon";
import type { SceActivityCreateMenuEntry } from "@/lib/sce/activity-create/activity-create-menu-config";
import { cn } from "@/lib/cn";

const ACCENT_CLASS_BY_TOKEN: Record<SceActivityCreateMenuEntry["accentToken"], string> = {
  "training-blue": "text-sky-400",
  "match-red": "text-[color-mix(in_srgb,var(--sce-secondary)_88%,white_12%)]",
  "tournament-orange": "text-orange-400",
  "club-event-violet": "text-violet-400",
};

type Props = {
  entry: SceActivityCreateMenuEntry;
  className?: string;
};

/** Restrained semantic icon tint for create menu rows (not full-row color blocks). */
export function SceActivityCreateMenuItemIcon({ entry, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center",
        ACCENT_CLASS_BY_TOKEN[entry.accentToken],
        className,
      )}
      data-activity-create-accent={entry.accentToken}
      aria-hidden
    >
      <SceIcon name={entry.sceIconName} size={16} />
    </span>
  );
}
