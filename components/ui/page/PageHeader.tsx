import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  /** Short muted label above the title (e.g. module name). */
  eyebrow?: ReactNode;
  /** Primary page title — required. */
  title: string;
  /** Optional supporting description shown below the title. */
  description?: string;
  /**
   * Optional badge or status pill rendered inline after the title.
   * Accepts any ReactNode (e.g. a <StatusBadge /> component).
   */
  badge?: ReactNode;
  className?: string;
};

/**
 * PageHeader
 *
 * Authoritative internal WebApp page header.
 *
 * DS2-03 sporting page titles use Barlow Condensed display italic (`.sce-type-page-title`).
 * Body copy and descriptions stay on Inter.
 *
 * Usage:
 *   <PageHeader
 *     eyebrow="Teams"
 *     title="Teams pro Saison"
 *     description="Teams sind saisongeführt …"
 *   />
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-1", className)}>
      {eyebrow && (
        <p className="text-xs font-medium tracking-wide text-[var(--muted)]">
          {eyebrow}
        </p>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <h1 className="sce-type-page-title min-w-0 break-words [overflow-wrap:anywhere]">
          {title}
        </h1>
        {badge}
      </div>

      {description && (
        <p className="mt-1 max-w-2xl break-words text-sm leading-relaxed text-[var(--text-2)] [overflow-wrap:anywhere]">
          {description}
        </p>
      )}
    </div>
  );
}
