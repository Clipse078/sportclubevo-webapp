import Link from "next/link";
import { ChevronRight, Newspaper } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CommandCenterNewsItem } from "@/lib/dashboard/command-center-presentation";

export type DashboardNewsGridProps = {
  items: CommandCenterNewsItem[];
  className?: string;
};

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
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--surface-2)]">
        {item.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- canonical tenant news hero media URL from server.
          <img
            src={item.heroImageUrl}
            alt={item.heroImageAlt ?? item.title}
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-[1.02]"
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

      <div className="flex flex-1 flex-col px-3.5 py-3 sm:px-4 sm:py-3.5">
        <p className="line-clamp-2 text-[0.875rem] font-semibold leading-snug text-[var(--foreground)]">
          {item.title}
        </p>
        {item.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-[0.75rem] leading-relaxed text-[var(--text-2)]">
            {item.excerpt}
          </p>
        )}
        {item.publishedAtLabel && (
          <p className="mt-auto pt-3 text-[0.6875rem] font-medium text-[var(--muted)]">
            {item.publishedAtLabel}
          </p>
        )}
      </div>
    </Link>
  );
}

export function DashboardNewsGrid({ items, className }: DashboardNewsGridProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <NewsCard key={item.key} item={item} />
      ))}
    </div>
  );
}

export type DashboardNewsSectionProps = {
  items: CommandCenterNewsItem[];
  listHref?: string;
  className?: string;
};

export function DashboardNewsSection({
  items,
  listHref = "/dashboard/website/news",
  className,
}: DashboardNewsSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[1.0625rem] font-semibold leading-snug text-[var(--foreground)] sm:text-lg">
          Aktuelle News
        </h2>
        <Link
          href={listHref}
          className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-[var(--sce-primary)] no-underline motion-safe:transition-colors motion-safe:hover:text-[color-mix(in_srgb,var(--sce-primary)_85%,var(--foreground))]"
        >
          Alle News
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <DashboardNewsGrid items={items} />
    </section>
  );
}
