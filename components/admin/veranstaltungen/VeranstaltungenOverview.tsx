import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import type { ClubEvent } from "@/lib/events/club-events-service";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/page/EmptyState";
import { SectionCard } from "@/components/ui/page/SectionCard";
import VeranstaltungListRow from "./VeranstaltungListRow";

export type VeranstaltungenTab = "BEVORSTEHEND" | "VERGANGEN" | "ARCHIV";

const TABS: { key: VeranstaltungenTab; label: string }[] = [
  { key: "BEVORSTEHEND", label: "Bevorstehend" },
  { key: "VERGANGEN", label: "Vergangen" },
  { key: "ARCHIV", label: "Archiv" },
];

type VeranstaltungenOverviewProps = {
  events: ClubEvent[];
  tab: VeranstaltungenTab;
  canManage: boolean;
  canDelete: boolean;
  timeZone?: string | null;
  basePath?: string;
};

function buildHref(basePath: string, tab: VeranstaltungenTab): string {
  const search = new URLSearchParams();
  if (tab === "VERGANGEN") search.set("tab", "vergangen");
  if (tab === "ARCHIV") search.set("tab", "archiv");
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function normalizeVeranstaltungenTab(
  value: string | null | undefined,
): VeranstaltungenTab {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "archiv") return "ARCHIV";
  if (normalized === "vergangen" || normalized === "past") return "VERGANGEN";
  return "BEVORSTEHEND";
}

function monthGroupLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    month: "long",
    year: "numeric",
    timeZone,
  }).format(date).toUpperCase();
}

function partitionEvents(events: ClubEvent[], tab: VeranstaltungenTab, now: Date) {
  const active = events.filter((e) => e.status !== "ARCHIVED");
  const archived = events.filter((e) => e.status === "ARCHIVED");

  if (tab === "ARCHIV") {
    return [...archived].sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );
  }

  const upcoming = active.filter((e) => {
    const end = e.endAt ?? e.startAt;
    return end.getTime() >= now.getTime();
  });
  const past = active.filter((e) => {
    const end = e.endAt ?? e.startAt;
    return end.getTime() < now.getTime();
  });

  if (tab === "VERGANGEN") {
    return [...past].sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );
  }

  return [...upcoming].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

function groupByMonth(events: ClubEvent[], timeZone: string) {
  const groups = new Map<string, ClubEvent[]>();
  for (const event of events) {
    const label = monthGroupLabel(new Date(event.startAt), timeZone);
    const bucket = groups.get(label) ?? [];
    bucket.push(event);
    groups.set(label, bucket);
  }
  return [...groups.entries()];
}

export default function VeranstaltungenOverview({
  events,
  tab,
  canManage,
  canDelete: _canDelete,
  timeZone,
  basePath = "/dashboard/veranstaltungen",
}: VeranstaltungenOverviewProps) {
  void _canDelete;
  const now = new Date();
  const tz = timeZone ?? "Europe/Zurich";

  const activeCount = events.filter((e) => e.status !== "ARCHIVED").length;
  const archivedCount = events.filter((e) => e.status === "ARCHIVED").length;
  const upcomingCount = events.filter((e) => {
    if (e.status === "ARCHIVED") return false;
    const end = e.endAt ?? e.startAt;
    return end.getTime() >= now.getTime();
  }).length;
  const pastCount = activeCount - upcomingCount;

  const visibleEvents = partitionEvents(events, tab, now);
  const grouped = groupByMonth(visibleEvents, tz);

  const tabCounts: Record<VeranstaltungenTab, number> = {
    BEVORSTEHEND: upcomingCount,
    VERGANGEN: pastCount,
    ARCHIV: archivedCount,
  };

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Veranstaltungen-Bereiche"
        className="flex gap-1 border-b border-[var(--border)]"
      >
        {TABS.map((item) => {
          const isActive = item.key === tab;
          return (
            <Link
              key={item.key}
              href={buildHref(basePath, item.key)}
              role="tab"
              aria-selected={isActive}
              data-testid={`veranstaltungen-tab-${item.key.toLowerCase()}`}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "border-[var(--sce-primary)] text-[var(--sce-primary)]"
                  : "border-transparent text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
            >
              {item.label}
              <span className="ml-2 sce-count-badge">{tabCounts[item.key]}</span>
            </Link>
          );
        })}
      </div>

      {visibleEvents.length === 0 ? (
        <SectionCard noPadding>
          <EmptyState
            icon={<CalendarDays className="h-8 w-8" />}
            heading={
              tab === "ARCHIV"
                ? "Kein Archiv vorhanden"
                : tab === "VERGANGEN"
                  ? "Keine vergangenen Veranstaltungen"
                  : "Keine bevorstehenden Veranstaltungen"
            }
            description={
              tab === "ARCHIV"
                ? "Archivierte Vereinsanlässe erscheinen hier."
                : "Erstelle eine Veranstaltung für deinen Verein."
            }
            action={
              tab === "BEVORSTEHEND" && canManage ? (
                <Link href="/dashboard/veranstaltungen/new" className="fca-button-primary">
                  <Plus className="h-4 w-4" />
                  Veranstaltung
                </Link>
              ) : undefined
            }
          />
        </SectionCard>
      ) : (
        <div className="space-y-6" data-testid={`veranstaltungen-list-${tab.toLowerCase()}`}>
          {grouped.map(([monthLabel, monthEvents]) => (
            <section key={monthLabel}>
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-[var(--muted)]">
                {monthLabel}
              </h2>
              <div className="rounded-md border border-[var(--border)]/80 bg-[var(--surface)]">
                {monthEvents.map((event) => (
                  <VeranstaltungListRow
                    key={event.id}
                    event={event}
                    timeZone={timeZone}
                    canManage={canManage}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
