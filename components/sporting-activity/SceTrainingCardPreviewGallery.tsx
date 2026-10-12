"use client";

import { SceTrainingCard } from "./SceTrainingCard";
import {
  createSceTrainingCardFixtureRecurring,
  createSceTrainingCardFixtureSession,
} from "./__fixtures__/sce-training-card-fixtures";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

const DENSITIES: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];

export function SceTrainingCardPreviewGallery() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <p className="text-sm text-[var(--muted)]">
        Deterministic Training Card family preview — session and recurring definition fixtures.
      </p>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Session
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DENSITIES.map((density) => (
            <SceTrainingCard
              key={`session-${density}`}
              model={createSceTrainingCardFixtureSession()}
              density={density}
              fmtCfg={FMT}
              linkToDetail={false}
            />
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Recurring definition
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DENSITIES.map((density) => (
            <SceTrainingCard
              key={`recurring-${density}`}
              model={createSceTrainingCardFixtureRecurring()}
              density={density}
              fmtCfg={FMT}
              linkToDetail={false}
              showStatus={density !== "COMPACT"}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
