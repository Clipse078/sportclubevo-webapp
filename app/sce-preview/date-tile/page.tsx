"use client";

import { SceDateTile } from "@/components/design-system/date";
import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";

const FMT = { locale: "de-CH", timezone: "Europe/Zurich" };

const SAMPLES = [
  { label: "Tue 17 Nov 2026", value: new Date("2026-11-17T12:00:00.000Z") },
  { label: "Date-only spring", value: { dateOnly: "2026-03-29" } as const },
  { label: "Leap day", value: { dateOnly: "2028-02-29" } as const },
];

export default function SceDateTilePreviewPage() {
  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-date-tile">
      <h1 className="mb-4 text-lg font-semibold text-[var(--foreground)]">SceDateTile — DS2 DATE-01</h1>
      <div className="flex flex-wrap items-start gap-6">
        {SAMPLES.map((sample) => (
          <div key={sample.label} className="flex flex-col items-center gap-2">
            <SceDateTile value={sample.value} fmtCfg={FMT} testId={`preview-date-tile-${sample.label}`} />
            <span className="text-xs text-[var(--muted)]">{sample.label}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-2">
          <SceDateTile
            value={new Date("2026-11-17T12:00:00.000Z")}
            fmtCfg={FMT}
            size="compact"
            testId="preview-date-tile-compact"
          />
          <span className="text-xs text-[var(--muted)]">Compact</span>
        </div>
      </div>
    </ScePreviewPitchCanvas>
  );
}
