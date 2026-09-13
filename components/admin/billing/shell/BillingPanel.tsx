import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BillingPanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: "default" | "none";
};

export default function BillingPanel({
  title,
  description,
  actions,
  children,
  className,
  padding = "default",
}: BillingPanelProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)]",
        "ring-1 ring-[color-mix(in_srgb,var(--border)_55%,transparent)]",
        padding === "default" && "p-5 sm:p-6",
        className,
      )}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-[var(--text-2)]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
