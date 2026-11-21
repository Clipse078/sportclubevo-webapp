import type { TaskStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

type Props = {
  status: TaskStatus;
  label: string;
};

const TONE: Record<TaskStatus, string> = {
  OPEN: "border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_92%,transparent)] text-[var(--text-2)]",
  IN_PROGRESS:
    "border-[color-mix(in_srgb,var(--sce-info)_35%,var(--border))] bg-[color-mix(in_srgb,var(--sce-info)_14%,transparent)] text-[var(--sce-info)]",
  DONE: "border-[color-mix(in_srgb,var(--green)_28%,var(--border))] bg-[color-mix(in_srgb,var(--green)_12%,transparent)] text-[var(--green)]",
  CANCELLED: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
};

export default function VereinsentwicklungWorkspaceTaskStatusPill({ status, label }: Props) {
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-center rounded-md border px-2 py-0.5 text-[0.68rem] font-semibold leading-tight whitespace-nowrap",
        TONE[status],
      )}
    >
      {label}
    </span>
  );
}