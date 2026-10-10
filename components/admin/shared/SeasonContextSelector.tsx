import Link from "next/link";

type SeasonOption = {
  key: string;
  name: string;
  isActive?: boolean;
};

type SeasonContextSelectorProps = {
  title?: string;
  description?: string;
  seasons: SeasonOption[];
  selectedSeasonKey?: string;
  basePath: string;
  /** Lighter presentation for list pages where season context must not dominate content. */
  variant?: "default" | "compact";
};

export default function SeasonContextSelector({
  title = "Aktive Saison",
  description = "Die Saison wird als führender Kontext für diese Seite verwendet.",
  seasons,
  selectedSeasonKey,
  basePath,
  variant = "default",
}: SeasonContextSelectorProps) {
  const selectedSeason =
    seasons.find((season) => season.key === selectedSeasonKey) ??
    seasons.find((season) => season.isActive) ??
    seasons[0] ??
    null;

  const isCompact = variant === "compact";

  return (
    <section
      className={
        isCompact
          ? "rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-3"
          : "rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"
      }
      data-testid="season-context-selector"
      data-variant={variant}
    >
      <div
        className={
          isCompact
            ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            : "flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"
        }
      >
        <div className={isCompact ? "min-w-0" : undefined}>
          <p
            className={
              isCompact
                ? "text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
                : "text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]"
            }
          >
            {title}
          </p>
          <h3
            className={
              isCompact
                ? "mt-0.5 truncate text-sm font-semibold text-[var(--foreground)]"
                : "mt-2 text-[1.15rem] font-semibold text-[var(--foreground)]"
            }
          >
            {selectedSeason?.name ?? "Keine Saison verfügbar"}
          </h3>
          {!isCompact ? (
            <p className="mt-2 text-sm text-[var(--text-2)]">{description}</p>
          ) : (
            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
              {description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {seasons.map((season) => {
            const isSelected = season.key === selectedSeason?.key;

            return (
              <Link
                key={season.key}
                href={`${basePath}?season=${encodeURIComponent(season.key)}`}
                className={
                  isSelected
                    ? isCompact
                      ? "rounded-full bg-[var(--sce-primary)] px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      : "fca-pill-year"
                    : isCompact
                      ? "rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-1 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                      : "rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                }
                data-testid={`season-option-${season.key}`}
                aria-current={isSelected ? "true" : undefined}
              >
                {season.name}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
