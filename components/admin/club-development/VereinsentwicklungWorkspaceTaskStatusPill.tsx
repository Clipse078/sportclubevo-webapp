import type { TaskStatus } from "@prisma/client";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  status: TaskStatus;
  label: string;
};

const TONE: Record<TaskStatus, string> = {
  OPEN: "border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-2)_90%,transparent)] text-[var(--text-2)]",
  IN_PROGRESS:
    "border-[color-mix(in_srgb,var(--sce-primary)_25%,var(--border))] bg-[color-mix(in_srgb,var(--sce-primary)_12%,transparent)] text-[var(--sce-primary)]",
  DONE: "border-[color-mix(in_srgb,var(--green)_25%,var(--border))] bg-[color-mix(in_srgb,var(--green)_12%,transparent)] text-[var(--green)]",
  CANCELLED: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
};

export default function VereinsentwicklungWorkspaceTaskStatusPill({ status, label }: Props) {
  const Icon = status === "DONE" ? CheckCircle2 : Circle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE[status],
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}