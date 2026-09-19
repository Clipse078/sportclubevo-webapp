import type { ReactNode } from "react";

type Props = {
  breadcrumbLeaf: string;
  title: string;
  subtitle: string;
  subtitleTestId?: string;
  actions?: ReactNode;
};

export default function PlanningManagementPageHeader({
  breadcrumbLeaf,
  title,
  subtitle,
  subtitleTestId,
  actions,
}: Props) {
  return (
    <header className="space-y-3 border-b border-[var(--border)] pb-4">
      <p className="text-xs text-[var(--muted)]">
        <span>Planung</span>
        <span className="mx-1.5 text-[var(--border-strong)]">›</span>
        <span className="text-[var(--text-2)]">{breadcrumbLeaf}</span>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[1.625rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
            {title}
          </h1>
          <p className="text-sm text-[var(--text-2)]" data-testid={subtitleTestId}>
            {subtitle}
          </p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
