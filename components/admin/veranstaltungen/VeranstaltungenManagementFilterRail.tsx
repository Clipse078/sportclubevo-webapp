"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import type {
  VeranstaltungenPublicationFilter,
  VeranstaltungenReviewFilter,
} from "@/lib/veranstaltungen/navigation";

const FILTER_CHIP_CLASS =
  "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors";

type Props = {
  resetHref: string;
  monthParam: string | null;
  currentMonthLabel: string;
  monthAllHref: string;
  monthCurrentHref: string;
  locationFilter: string | null;
  locationOptions: string[];
  reviewFilter: VeranstaltungenReviewFilter;
  publicationFilter: VeranstaltungenPublicationFilter;
  locationHrefByValue: Record<string, string>;
  reviewHrefByValue: Record<VeranstaltungenReviewFilter, string>;
  publicationHrefByValue: Record<VeranstaltungenPublicationFilter, string>;
};

function navigate(href: string) {
  if (typeof window !== "undefined") window.location.assign(href);
}

export default function VeranstaltungenManagementFilterRail(props: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 sm:col-span-2 min-[105rem]:col-span-1"
      aria-label="Filter"
      data-testid="veranstaltungen-filter-rail"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Filter</h3>
        <Link
          href={props.resetHref}
          className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
          data-testid="veranstaltungen-filter-reset"
        >
          Zurücksetzen
        </Link>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Monat / Zeitraum
          </p>
          <div className="flex flex-wrap gap-1.5" data-testid="veranstaltungen-filter-month-chips">
            <Link
              href={props.monthAllHref}
              className={cn(
                FILTER_CHIP_CLASS,
                !props.monthParam
                  ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                  : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
              )}
              data-testid="veranstaltungen-filter-month-all"
            >
              Alle Monate
            </Link>
            <Link
              href={props.monthCurrentHref}
              className={cn(
                FILTER_CHIP_CLASS,
                props.monthParam
                  ? "border-[var(--sce-primary)] bg-[var(--sce-primary-light)] text-[var(--sce-primary)]"
                  : "border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
              )}
              data-testid="veranstaltungen-filter-month-current"
            >
              {props.currentMonthLabel}
            </Link>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Status
          </span>
          <select
            className="fca-input w-full text-sm"
            value={props.reviewFilter}
            onChange={(e) => navigate(props.reviewHrefByValue[e.target.value as VeranstaltungenReviewFilter])}
            aria-label="Status filtern"
            data-testid="veranstaltungen-review-filter"
          >
            <option value="ALLE">Alle Status</option>
            <option value="DRAFT">Entwurf</option>
            <option value="APPROVED">Freigegeben</option>
            <option value="PUBLISHED">Veröffentlicht</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Veröffentlichung
          </span>
          <select
            className="fca-input w-full text-sm"
            value={props.publicationFilter}
            onChange={(e) =>
              navigate(props.publicationHrefByValue[e.target.value as VeranstaltungenPublicationFilter])
            }
            aria-label="Veröffentlichung filtern"
            data-testid="veranstaltungen-publication-filter"
          >
            <option value="ALLE">Alle</option>
            <option value="PUBLIC">Öffentlich sichtbar</option>
            <option value="INTERNAL">Intern</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Ort
          </span>
          <select
            className="fca-input w-full text-sm"
            value={props.locationFilter ?? ""}
            onChange={(e) =>
              navigate(props.locationHrefByValue[e.target.value] ?? props.locationHrefByValue[""]!)
            }
            aria-label="Ort filtern"
            data-testid="veranstaltungen-location-filter"
          >
            <option value="">Alle Orte</option>
            {props.locationOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
