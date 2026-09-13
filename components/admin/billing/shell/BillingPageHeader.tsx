import type { ReactNode } from "react";

type BillingPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Compact title for detail heroes (e.g. invoice number). */
  size?: "default" | "hero";
};

export default function BillingPageHeader({
  title,
  description,
  actions,
  size = "default",
}: BillingPageHeaderProps) {
  const titleClass =
    size === "hero"
      ? "text-[1.75rem] font-semibold tracking-tight text-[var(--foreground)] leading-tight sm:text-[2rem]"
      : "text-2xl font-semibold tracking-tight text-[var(--foreground)] leading-tight";

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className={titleClass}>{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--text-2)] leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </header>
  );
}
