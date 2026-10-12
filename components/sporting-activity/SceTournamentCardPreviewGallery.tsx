"use client";

import { SceTournamentCard } from "./SceTournamentCard";
import { createSceTournamentCardFixture } from "./__fixtures__/sce-tournament-card-fixtures";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

const DENSITIES: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];

export function SceTournamentCardPreviewGallery() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <p className="text-sm text-[var(--muted)]">
        Deterministic Tournament Card family preview — organiser visibility and location hierarchy fixtures.
      </p>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Standard fixture
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DENSITIES.map((density) => (
            <SceTournamentCard
              key={`standard-${density}`}
              model={createSceTournamentCardFixture()}
              density={density}
              fmtCfg={FMT}
              linkToDetail={false}
            />
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Long title · missing hauptteam · narrow MICRO
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SceTournamentCard
            model={createSceTournamentCardFixture({
              tournamentTitle:
                "Hallenturnier Junioren E mit sehr langem Namen für Responsive-Prüfung ".repeat(2).trim(),
              hauptteam: undefined,
            })}
            density="STANDARD"
            fmtCfg={FMT}
            linkToDetail={false}
          />
          <SceTournamentCard
            model={createSceTournamentCardFixture()}
            density="MICRO"
            fmtCfg={FMT}
            linkToDetail={false}
            className="sce-tournament-micro-narrow max-w-[9rem]"
          />
        </div>
      </section>
    </div>
  );
}
