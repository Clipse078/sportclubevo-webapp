"use client";

import { SceTournamentCard } from "./SceTournamentCard";
import {
  createSceTournamentCardFixture,
  createSceTournamentExternalOrganiserFixture,
  createSceTournamentOrganiserFallbackFixture,
  createSceTournamentTenantOrganiserFixture,
} from "./__fixtures__/sce-tournament-card-fixtures";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";
import { buildSceActivityPresentationStatus } from "@/lib/sporting-activity-presentation/canonical/status";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

const DENSITIES: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];

export function SceTournamentCardPreviewGallery() {
  const tenantFixture = createSceTournamentTenantOrganiserFixture();
  const externalFixture = createSceTournamentExternalOrganiserFixture();
  const fallbackFixture = createSceTournamentOrganiserFallbackFixture();

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <p className="text-sm text-[var(--muted)]">
        Deterministic Tournament Card family preview — organiser crest, hierarchy, and density contracts
        for PO R1 visual UAT.
      </p>

      <section className="space-y-4" data-testid="sce-tournament-preview-tenant-real-crest">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          TENANT ORGANISER — REAL CREST
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DENSITIES.map((density) => (
            <SceTournamentCard
              key={`tenant-${density}`}
              model={tenantFixture}
              density={density}
              fmtCfg={FMT}
              linkToDetail={false}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4" data-testid="sce-tournament-preview-external-real-crest">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          EXTERNAL ORGANISER — REAL CREST
        </h2>
        <SceTournamentCard
          model={externalFixture}
          density="STANDARD"
          fmtCfg={FMT}
          linkToDetail={false}
        />
      </section>

      <section className="space-y-4" data-testid="sce-tournament-preview-no-crest-fallback">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          NO CREST — FALLBACK
        </h2>
        <SceTournamentCard
          model={fallbackFixture}
          density="STANDARD"
          fmtCfg={FMT}
          linkToDetail={false}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Status variants · long content · narrow MICRO
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SceTournamentCard
            model={createSceTournamentCardFixture({
              status: buildSceActivityPresentationStatus({
                domain: "cancelled",
                label: "Abgesagt",
              }),
            })}
            density="STANDARD"
            fmtCfg={FMT}
            linkToDetail={false}
          />
          <SceTournamentCard
            model={createSceTournamentCardFixture({
              tournamentTitle:
                "Hallenturnier Junioren E mit sehr langem Namen für Responsive-Prüfung ".repeat(2).trim(),
              organiser: tenantFixture.organiser,
              hauptteam: undefined,
            })}
            density="STANDARD"
            fmtCfg={FMT}
            linkToDetail={false}
          />
          <SceTournamentCard
            model={tenantFixture}
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
