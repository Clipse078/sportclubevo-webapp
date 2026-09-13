import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function BillingDataTableShell({ children, className }: Props) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[var(--radius-lg)]",
        "ring-1 ring-[color-mix(in_srgb,var(--border)_55%,transparent)]",
        className,
      )}
    >
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}

export function BillingDataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-[color-mix(in_srgb,var(--muted)_12%,transparent)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
      {children}
    </thead>
  );
}

export function BillingDataTableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn(
        "border-t border-[color-mix(in_srgb,var(--border)_45%,transparent)]",
        "transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]",
        className,
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "link" : undefined}
    >
      {children}
    </tr>
  );
}

export function BillingDataTableCell({
  children,
  className,
  align,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 align-middle sm:px-4 sm:py-3",
        align === "right" && "text-right tabular-nums",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function BillingDataTableHeaderCell({
  children,
  className,
  align,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 font-medium sm:px-4 sm:py-3",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}
