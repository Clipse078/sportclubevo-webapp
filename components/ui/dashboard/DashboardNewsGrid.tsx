import Link from "next/link";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CommandCenterNewsItem } from "@/lib/dashboard/command-center-presentation";

export type DashboardNewsGridProps = {
  items: CommandCenterNewsItem[];
  className?: string;
  variant?: "default" | "compact";
  maxItems?: number;
};

function CompactNewsCard({ item }: { item: CommandCenterNewsItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex min-h-[5.5rem] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] no-underline",
        "motion-safe:transition-[border-color,box-shadow,transform] motion-safe:duration-150",
        "motion-safe:hover:-translate-y-px motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:shadow-[var(--shadow-sm)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
      )}
    >
      <div className="relative h-auto w-[7.25rem] shrink-0 overflow-hidden bg-[var(--surface-2)] sm:w-[8rem]">
        {item.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- canonical tenant news hero media URL from server.
          <img
            src={item.heroImageUrl}
            alt={item.heroImageAlt ?? item.title}
            className="h-full min-h-[5.5rem] w-full object-cover motion-safe:transition-transform motion-safe:duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full min-h-[5.5rem] w-full items-center justify-center bg-[linear-gradient(145deg,var(--surface-2)_0%,color-mix(in_srgb,var(--background)_88%,var(--surface-2))_100%)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--sce-primary)_12%,transparent)] text-[var(--sce-primary)]">
              <Newspaper className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5 sm:px-3.5">
        <p className="line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-[var(--foreground)]">
          {item.title}
        </p>
        {item.excerpt && (
          <p className="mt-0.5 line-clamp-1 text-[0.6875rem] leading-relaxed text-[var(--text-2)]">
            {item.excerpt}
          </p>
        )}
        {item.publishedAtLabel && (
          <p className="mt-1 text-[0.625rem] font-medium text-[var(--muted)]">
            {item.publishedAtLabel}
          </p>
        )}
      </div>
    </Link>
  );
}

function NewsCard({ item }: { item: CommandCenterNewsItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] no-underline",
        "motion-safe:transition-[border-color,box-shadow,transform] motion-safe:duration-150",
        "motion-safe:hover:-translate-y-px motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:shadow-[var(--shadow-sm)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
      )}
    >
      <div className="relative h-[9.375rem] w-full overflow-hidden bg-[var(--surface-2)] sm:h-[10.5rem] xl:h-[11.25rem]">
        {item.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- canonical tenant news hero media URL from server.
          <img
            src={item.heroImageUrl}
            alt={item.heroImageAlt ?? item.title}
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(145deg,var(--surface-2)_0%,color-mix(in_srgb,var(--background)_88%,var(--surface-2))_100%)] px-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--sce-primary)_12%,transparent)] text-[var(--sce-primary)]">
              <Newspaper className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="line-clamp-2 text-[0.75rem] font-semibold leading-snug text-[var(--foreground)]">
              {item.title}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3.5 py-3 sm:px-4">
        <p className="line-clamp-2 text-[0.875rem] font-semibold leading-snug text-[var(--foreground)]">
          {item.title}
        </p>
        {item.excerpt && (
          <p className="mt-1 line-clamp-2 text-[0.75rem] leading-relaxed text-[var(--text-2)]">
            {item.excerpt}
          </p>
        )}
        {item.publishedAtLabel && (
          <p className="mt-auto pt-2.5 text-[0.6875rem] font-medium text-[var(--muted)]">
            {item.publishedAtLabel}
          </p>
        )}
      </div>
    </Link>
  );
}

export function DashboardNewsGrid({
  items,
  className,
  variant = "default",
  maxItems,
}: DashboardNewsGridProps) {
  if (items.length === 0) return null;

  const visibleItems = maxItems ? items.slice(0, maxItems) : items;

  if (variant === "compact") {
    return (
      <div className={cn("flex flex-col gap-2.5", className)}>
        {visibleItems.map((item) => (
          <CompactNewsCard key={item.key} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3",
        className,
      )}
    >
      {visibleItems.map((item) => (
        <NewsCard key={item.key} item={item} />
      ))}
    </div>
  );
}

export type DashboardNewsSectionProps = {
  items: CommandCenterNewsItem[];
  listHref?: string;
  className?: string;
  variant?: "default" | "compact";
  maxItems?: number;
  embedded?: boolean;
};

export function DashboardNewsSection({
  items,
  listHref = "/dashboard/website/news",
  className,
  variant = "default",
  maxItems,
  embedded = false,
}: DashboardNewsSectionProps) {
  if (items.length === 0) return null;

  const footerLink = (
    <Link href={listHref} className="sce-link-primary text-[0.8125rem]">
      Alle News anzeigen →
    </Link>
  );

  return (
    <section className={className}>
      {!embedded && (
        <h2 className="mb-3.5 text-[1.0625rem] font-semibold leading-snug text-[var(--foreground)] sm:text-lg">
          Aktuelle News
        </h2>
      )}
      <DashboardNewsGrid items={items} variant={variant} maxItems={maxItems} />
      {!embedded && footerLink}
    </section>
  );
}
