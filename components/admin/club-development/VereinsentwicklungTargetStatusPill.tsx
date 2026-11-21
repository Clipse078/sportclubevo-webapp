import type { TargetStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { TARGET_STATUS_BADGE_CLASSES } from "@/lib/targets/target-presentation";

type Props = {
  status: TargetStatus;
  label: string;
  className?: string;
};

export default function VereinsentwicklungTargetStatusPill({ status, label, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-md border px-2 py-0.5 text-[0.68rem] font-semibold leading-tight",
        TARGET_STATUS_BADGE_CLASSES[status] ?? TARGET_STATUS_BADGE_CLASSES.DRAFT,
        className,
      )}
    >
      {label}
    </span>
  );
}