import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type CommunicationHubCapabilityLinkProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  linkLabel: string;
  className?: string;
};

/**
 * Calm, task-oriented hub navigation card (SCE-COMM-UX-02).
 * Whole surface is one semantic link — no nested controls.
 */
export function CommunicationHubCapabilityLink({
  href,
  title,
  description,
  icon: Icon,
  linkLabel,
  className,
}: CommunicationHubCapabilityLinkProps) {
  return (
    <Link
      href={href}
      aria-label={linkLabel}
      className={cn(
        "group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--sce-surface-border)] bg-[var(--sce-surface-standard)] p-4 no-underline md:p-5",
        "motion-safe:transition-[background-color,border-color,box-shadow,transform] motion-safe:duration-150",
        "motion-safe:hover:-translate-y-px motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:bg-[var(--surface-2)] motion-safe:hover:shadow-[var(--shadow-sm)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">{description}</p>
        </div>
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--sce-primary)]">
        Öffnen
        <ArrowRight
          className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
