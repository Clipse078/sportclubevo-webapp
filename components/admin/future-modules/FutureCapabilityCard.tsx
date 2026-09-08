import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

type FutureCapabilityCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
};

export function FutureCapabilityCard({
  title,
  description,
  icon: Icon,
  className,
}: FutureCapabilityCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--muted)]"
            aria-hidden="true"
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        </div>
        <Badge variant="default" size="sm">In Vorbereitung</Badge>
      </div>

      <div className="flex flex-1 flex-col px-5 py-4">
        <p className="text-sm leading-6 text-[var(--text-2)]">{description}</p>
        <p className="mt-auto pt-4 text-[0.7rem] font-medium text-[var(--muted)]">
          Strukturell vorbereitet · Noch ohne operative Workflows
        </p>
      </div>
    </article>
  );
}
