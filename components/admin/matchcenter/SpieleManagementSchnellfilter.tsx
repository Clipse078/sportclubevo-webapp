"use client";

import Link from "next/link";
import { ChevronDown, Info } from "lucide-react";
import { useId, useState } from "react";
import type {
  SpieleHomeAwayFilter,
  SpieleStatusMaskKey,
} from "@/lib/matchcenter/navigation";
import type {
  SpieleSchnellfilterLinkOption,
  SpieleSchnellfilterZeitraumLinks,
} from "./spiele-schnellfilter-types";
import { cn } from "@/lib/cn";

type Props = {
  homeAwayFilter: SpieleHomeAwayFilter;
  statusMask: readonly SpieleStatusMaskKey[];
  statusCounts: Record<SpieleStatusMaskKey, number>;
  alleHref: string;
  heimHref: string;
  auswaertsHref: string;
  statusToggleHrefs: Record<SpieleStatusMaskKey, string>;
  resetHref: string;
  teamFilterLinks: readonly SpieleSchnellfilterLinkOption[];
  competitionFilterLinks: readonly SpieleSchnellfilterLinkOption[];
  venueFilterLinks: readonly SpieleSchnellfilterLinkOption[];
  zeitraumLinks: SpieleSchnellfilterZeitraumLinks;
};

const STATUS_ITEMS: { key: SpieleStatusMaskKey; label: string }[] = [
  { key: "anstehend", label: "Anstehend" },
  { key: "offen", label: "Offen" },
  { key: "bereit", label: "Bereit" },
  { key: "abgesagt", label: "Abgesagt" },
];

function FilterLinkList({
  options,
  emptyLabel,
}: {
  options: readonly SpieleSchnellfilterLinkOption[];
  emptyLabel: string;
}) {
  if (options.length === 0) {
    return <p className="px-1 py-1 text-[0.6875rem] text-[var(--muted)]">{emptyLabel}</p>;
  }

  return (
    <ul className="max-h-40 space-y-0.5 overflow-y-auto" role="list">
      {options.map((option) => (
        <li key={option.key}>
          <Link
            href={option.href}
            data-testid={`spiele-schnellfilter-link-${option.key}`}
            aria-current={option.active ? "true" : undefined}
            className={cn(
              "block rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-[var(--surface-2)]",
              option.active
                ? "bg-[var(--surface-2)] font-semibold text-[var(--foreground)]"
                : "text-[var(--text-2)]",
            )}
          >
            {option.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CollapsibleSection({
  title,
  count,
  testId,
  children,
}: {
  title: string;
  count?: number;
  testId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-t border-[var(--border)]/60 pt-2">
      <button
        type="button"
        id={`${testId}-trigger`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md py-1.5 text-left text-xs font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        aria-expanded={open}
        aria-controls={panelId}
        data-testid={testId}
      >
        <span>
          {title}
          {count != null ? (
            <span className="ml-1 font-normal text-[var(--muted)]">({count})</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div id={panelId} className="pb-2 pt-1" data-testid={`${testId}-panel`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default function SpieleManagementSchnellfilter({
  homeAwayFilter,
  statusMask,
  statusCounts,
  alleHref,
  heimHref,
  auswaertsHref,
  statusToggleHrefs,
  resetHref,
  teamFilterLinks,
  competitionFilterLinks,
  venueFilterLinks,
  zeitraumLinks,
}: Props) {
  const maskSet = new Set(statusMask);

  const haItems: { key: SpieleHomeAwayFilter; label: string; href: string }[] = [
    { key: "ALLE", label: "Alle", href: alleHref },
    { key: "HOME", label: "Heim", href: heimHref },
    { key: "AWAY", label: "Auswärts", href: auswaertsHref },
  ];

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Schnellfilter"
      data-testid="spiele-schnellfilter"
    >
      <h3 className="text-sm font-semibold text-[var(--foreground)]">Schnellfilter</h3>

      <div
        className="mt-3 inline-flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-0.5"
        role="group"
        aria-label="Heim oder Auswärts"
      >
        {haItems.map((item) => {
          const active = homeAwayFilter === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              data-testid={`spiele-ha-filter-${item.key.toLowerCase()}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-colors",
                active
                  ? "bg-[var(--sce-primary)] text-white"
                  : "text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          Status
        </p>
        <ul className="mt-2 space-y-1.5">
          {STATUS_ITEMS.map((item) => {
            const checked = maskSet.has(item.key);
            return (
              <li key={item.key}>
                <Link
                  href={statusToggleHrefs[item.key]}
                  data-testid={`spiele-status-toggle-${item.key}`}
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-[var(--surface-2)]"
                  aria-pressed={checked}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        checked
                          ? "border-[var(--sce-primary)] bg-[var(--sce-primary)] text-white"
                          : "border-[var(--border)] bg-[var(--surface)]",
                      )}
                      aria-hidden="true"
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="text-[var(--text-2)]">{item.label}</span>
                  </span>
                  <span className="tabular-nums text-[var(--muted)]">
                    {statusCounts[item.key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <CollapsibleSection
        title="Teams"
        count={teamFilterLinks.length > 0 ? teamFilterLinks.length - 1 : 0}
        testId="spiele-schnellfilter-teams"
      >
        <FilterLinkList options={teamFilterLinks} emptyLabel="Keine Teams verfügbar." />
      </CollapsibleSection>

      <CollapsibleSection
        title="Wettbewerbe"
        count={competitionFilterLinks.length > 0 ? competitionFilterLinks.length - 1 : 0}
        testId="spiele-schnellfilter-competitions"
      >
        <FilterLinkList
          options={competitionFilterLinks}
          emptyLabel="Keine Wettbewerbe in diesem Monat."
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Spielorte"
        count={venueFilterLinks.length > 0 ? venueFilterLinks.length - 1 : 0}
        testId="spiele-schnellfilter-venues"
      >
        <FilterLinkList
          options={venueFilterLinks}
          emptyLabel="Keine Spielorte in diesem Monat."
        />
      </CollapsibleSection>

      <CollapsibleSection title="Zeitraum" testId="spiele-schnellfilter-zeitraum">
        <div className="space-y-2 px-1">
          <p className="text-xs font-medium text-[var(--foreground)]">{zeitraumLinks.monthLabel}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={zeitraumLinks.previousHref}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-[0.6875rem] font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              data-testid="spiele-schnellfilter-month-previous"
            >
              ‹ Vorheriger Monat
            </Link>
            <Link
              href={zeitraumLinks.nextHref}
              className="rounded-md border border-[var(--border)] px-2 py-1 text-[0.6875rem] font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              data-testid="spiele-schnellfilter-month-next"
            >
              Nächster Monat ›
            </Link>
            {zeitraumLinks.todayHref ? (
              <Link
                href={zeitraumLinks.todayHref}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-[0.6875rem] font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]"
                data-testid="spiele-schnellfilter-month-today"
              >
                Heute
              </Link>
            ) : null}
          </div>
        </div>
      </CollapsibleSection>

      <Link
        href={resetHref}
        className="mt-3 block w-full rounded-lg border border-[var(--border)] py-2 text-center text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]"
        data-testid="spiele-filter-reset"
      >
        Filter zurücksetzen
      </Link>

      <div
        className="mt-3 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-2)]/30 p-3"
        data-testid="spiele-matchvorbereitung-info"
      >
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-[var(--foreground)]">Matchvorbereitung</p>
            <p className="text-[0.6875rem] leading-relaxed text-[var(--muted)]">
              Bereite deine Spiele optimal vor: Prüfe Spielfeld, Kabinen und Infoboard-Einträge.
            </p>
            <span className="inline-block text-[0.6875rem] font-medium text-[var(--text-2)]">
              Mehr erfahren →
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
