"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { SceMatchCard } from "@/components/sporting-activity/SceMatchCard";
import { SCE_MATCH_CARD_PREVIEW_MODELS } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";
import type { SceActivityPresentationDensity } from "@/lib/sporting-activity-presentation/canonical/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

const DENSITIES: SceActivityPresentationDensity[] = ["HERO", "STANDARD", "COMPACT", "MICRO"];

const FMT: TenantFormatConfig = { locale: "de-CH", timezone: "Europe/Zurich" };

type GallerySection = {
  title: string;
  modelKey: keyof typeof SCE_MATCH_CARD_PREVIEW_MODELS;
};

const SECTIONS: GallerySection[] = [
  { title: "Bevorstehend", modelKey: "upcomingStandard" },
  { title: "Heute (Badge)", modelKey: "heuteBadge" },
  { title: "Morgen (Badge)", modelKey: "morgenBadge" },
  { title: "Live", modelKey: "liveWithScore" },
  { title: "Abgeschlossen mit Ergebnis", modelKey: "completedWithResult" },
  { title: "0:0 (echtes Ergebnis)", modelKey: "actualZeroZero" },
  { title: "Abgesagt", modelKey: "cancelled" },
  { title: "Lange Vereinsnamen", modelKey: "longNames" },
  { title: "Fehlende Wappen", modelKey: "missingCrests" },
  { title: "Auswärtsspiel (FCA rechts)", modelKey: "awayFixture" },
];

export function SceMatchCardPreviewGallery() {
  return (
    <ScePreviewPitchCanvas
      className="px-4 py-8 text-[var(--foreground)] sm:px-6"
      testId="sce-match-card-preview-gallery"
    >
      <header className="mx-auto mb-8 max-w-5xl space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">SCE Match Card — 01D / R7 Preview</h1>
        <p className="text-sm text-[var(--text-2)]">
          Deterministische Fixtures · keine Datenbank · PO Visual UAT
        </p>
      </header>

      <div className="mx-auto max-w-5xl space-y-10">
        {SECTIONS.map((section) => {
          const model = SCE_MATCH_CARD_PREVIEW_MODELS[section.modelKey];
          return (
            <section key={section.modelKey} className="space-y-4">
              <h2 className="text-lg font-medium">{section.title}</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {DENSITIES.map((density) => (
                  <div key={density} className="min-w-0 space-y-1">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {density}
                    </p>
                    <SceMatchCard
                      model={model}
                      density={density}
                      fmtCfg={FMT}
                      linkToDetail={false}
                      testId={`sce-match-preview-${section.modelKey}-${density}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <section className="space-y-3" data-testid="sce-match-preview-narrow">
          <h2 className="text-lg font-medium">Schmale Breite (320px)</h2>
          <div className="w-[320px] max-w-full border border-dashed border-[var(--border)] p-2">
            <SceMatchCard
              model={SCE_MATCH_CARD_PREVIEW_MODELS.longNames}
              density="STANDARD"
              fmtCfg={FMT}
              linkToDetail={false}
            />
          </div>
        </section>
      </div>
    </ScePreviewPitchCanvas>
  );
}
