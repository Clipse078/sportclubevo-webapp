"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { SceActivityComposerPreviewHarness } from "@/components/sce/activity-composer/SceActivityComposerPreviewHarness";

export default function SceActivityComposerPreviewPage() {
  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-activity-composer">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          SCE Activity Composer — Foundation Preview (01B)
        </h1>
        <p className="text-sm text-[var(--text-2)]">
          Overlay-Modus — keine Domain-Persistenz, keine Produktionsmigration.
        </p>
        <SceActivityComposerPreviewHarness initialContainerMode="overlay" />
      </div>
    </ScePreviewPitchCanvas>
  );
}
