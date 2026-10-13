"use client";

import { SceClubEventCard } from "./SceClubEventCard";
import {
  createSceClubEventAllDayFixture,
  createSceClubEventLongTitleFixture,
  createSceClubEventMissingLocationFixture,
  createSceClubEventMissingOrganiserFixture,
  createSceClubEventTimedFixture,
} from "./__fixtures__/sce-club-event-card-fixtures";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

const DENSITIES: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];

export function SceClubEventCardPreviewGallery() {
  const timed = createSceClubEventTimedFixture();
  const allDay = createSceClubEventAllDayFixture();

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <p className="text-sm text-[var(--muted)]">
        Deterministic Club Event Card family preview — VERANSTALTUNG hierarchy, all-day semantics,
        and density contracts for PO visual UAT.
      </p>

      <section className="space-y-4" data-testid="sce-club-event-preview-timed">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          TIMED CLUB EVENT
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DENSITIES.map((density) => (
            <SceClubEventCard
              key={`timed-${density}`}
              model={timed}
              density={density}
              fmtCfg={FMT}
              linkToDetail={false}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4" data-testid="sce-club-event-preview-all-day">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          ALL-DAY CLUB EVENT
        </h2>
        <SceClubEventCard model={allDay} density="STANDARD" fmtCfg={FMT} linkToDetail={false} />
      </section>

      <section className="space-y-4" data-testid="sce-club-event-preview-long-title">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          LONG TITLE
        </h2>
        <SceClubEventCard
          model={createSceClubEventLongTitleFixture()}
          density="COMPACT"
          fmtCfg={FMT}
          linkToDetail={false}
        />
      </section>

      <section className="space-y-4" data-testid="sce-club-event-preview-missing-organiser">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          MISSING ORGANISER
        </h2>
        <SceClubEventCard
          model={createSceClubEventMissingOrganiserFixture()}
          density="STANDARD"
          fmtCfg={FMT}
          linkToDetail={false}
        />
      </section>

      <section className="space-y-4" data-testid="sce-club-event-preview-missing-location">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          MISSING LOCATION
        </h2>
        <SceClubEventCard
          model={createSceClubEventMissingLocationFixture()}
          density="STANDARD"
          fmtCfg={FMT}
          linkToDetail={false}
        />
      </section>
    </div>
  );
}
