import type { ClubEvent } from "@/lib/events/club-events-service";
import type { VeranstaltungenTab } from "./navigation";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import type {
  VeranstaltungenPublicationFilter,
  VeranstaltungenReviewFilter,
} from "./navigation";

export type VeranstaltungenKpis = {
  upcoming: number;
  past: number;
  total: number;
  uniqueVenues: number;
};

export type VeranstaltungenDayGroup = {
  key: string;
  heading: string;
  events: ClubEvent[];
};

function eventEndTime(event: ClubEvent): number {
  return new Date(event.endAt ?? event.startAt).getTime();
}

function isPublished(event: ClubEvent): boolean {
  return (
    event.reviewStage === "PUBLISHED" ||
    event.websiteVisible ||
    event.homepageVisible ||
    event.wochenplanVisible
  );
}

function isInternalOnly(event: ClubEvent): boolean {
  return !isPublished(event);
}

export function partitionVeranstaltungenByTab(
  events: ClubEvent[],
  tab: VeranstaltungenTab,
  now: Date,
): ClubEvent[] {
  const active = events.filter((e) => e.status !== "ARCHIVED");
  const archived = events.filter((e) => e.status === "ARCHIVED");

  if (tab === "ARCHIV") {
    return [...archived].sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );
  }

  const upcoming = active.filter((e) => eventEndTime(e) >= now.getTime());
  const past = active.filter((e) => eventEndTime(e) < now.getTime());

  if (tab === "VERGANGEN") {
    return [...past].sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );
  }

  return [...upcoming].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}

export function computeVeranstaltungenKpis(events: ClubEvent[], now: Date): VeranstaltungenKpis {
  const active = events.filter((e) => e.status !== "ARCHIVED");
  const upcoming = active.filter((e) => eventEndTime(e) >= now.getTime()).length;
  const past = active.filter((e) => eventEndTime(e) < now.getTime()).length;
  const venues = new Set(
    active.map((e) => e.location?.trim()).filter((v): v is string => Boolean(v)),
  );
  return {
    upcoming,
    past,
    total: active.length,
    uniqueVenues: venues.size,
  };
}

export function filterVeranstaltungenEvents(
  events: ClubEvent[],
  opts: {
    search: string;
    location: string | null;
    review: VeranstaltungenReviewFilter;
    publication: VeranstaltungenPublicationFilter;
    monthFrom?: Date;
    monthTo?: Date;
    timeZone: string;
  },
): ClubEvent[] {
  const query = opts.search.trim().toLowerCase();

  return events.filter((event) => {
    if (opts.monthFrom && opts.monthTo) {
      const start = new Date(event.startAt).getTime();
      if (start < opts.monthFrom.getTime() || start > opts.monthTo.getTime()) {
        return false;
      }
    }

    if (opts.location && (event.location?.trim() ?? "") !== opts.location) {
      return false;
    }

    if (opts.review !== "ALLE" && event.reviewStage !== opts.review) {
      return false;
    }

    if (opts.publication === "PUBLIC" && !isPublished(event)) return false;
    if (opts.publication === "INTERNAL" && !isInternalOnly(event)) return false;

    if (!query) return true;

    const haystack = [
      event.title,
      event.location,
      event.organizerName,
      event.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function groupVeranstaltungenByMonth(
  events: ClubEvent[],
  timeZone: string,
): VeranstaltungenDayGroup[] {
  const formatter = new Intl.DateTimeFormat("de-CH", {
    month: "long",
    year: "numeric",
    timeZone,
  });

  const groups = new Map<string, { heading: string; events: ClubEvent[] }>();
  for (const event of events) {
    const start = new Date(event.startAt);
    const key = matchDayKeyInTimezone(start, timeZone).slice(0, 7);
    const heading = formatter.format(start);
    const existing = groups.get(key);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.set(key, { heading, events: [event] });
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, group]) => ({
      key,
      heading: group.heading,
      events: group.events,
    }));
}

export function collectVeranstaltungenCalendarDayKeys(
  events: ClubEvent[],
  timeZone: string,
): string[] {
  const keys = new Set<string>();
  for (const event of events) {
    keys.add(matchDayKeyInTimezone(new Date(event.startAt), timeZone));
  }
  return [...keys];
}

export function listVeranstaltungenLocationOptions(events: ClubEvent[]): string[] {
  const set = new Set<string>();
  for (const event of events) {
    const loc = event.location?.trim();
    if (loc) set.add(loc);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "de"));
}
