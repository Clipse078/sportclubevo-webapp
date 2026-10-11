import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  id?: string;
  className?: string;
  /** LEVEL 1 page titles use slightly larger type; LEVEL 2 section/card default. */
  level?: "page" | "section";
};

/**
 * SCE-UI-STANDARD-01 — icon-led section / card header.
 */
export function SceSectionHeader({
  title,
  description,
  icon: Icon,
  id,
  className,
  level = "section",
}: Props) {
  const titleClass =
    level === "page"
      ? "text-lg font-semibold tracking-tight text-[var(--foreground)]"
      : "text-base font-semibold text-[var(--foreground)]";

  return (
    <header className={cn("min-w-0", className)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 id={id} className={titleClass}>
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">{description}</p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
