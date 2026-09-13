import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Two-column detail layout with consistent gap and collapse on narrow viewports. */
export default function BillingDetailGrid({ children, className }: Props) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-2 lg:items-start", className)}>{children}</div>
  );
}

export function BillingDefinitionList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2", className)}>{children}</dl>
  );
}

export function BillingDefinitionItem({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[0.8125rem] text-[var(--text-2)]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[var(--foreground)]">{children}</dd>
    </div>
  );
}
