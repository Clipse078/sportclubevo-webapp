"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { SceActivityComposerPreviewHarness } from "@/components/sce/activity-composer/SceActivityComposerPreviewHarness";

export default function SceActivityComposerPageModePreviewPage() {
  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-activity-composer-page">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">
          SCE Activity Composer — Page Mode Preview (01B)
        </h1>
        <SceActivityComposerPreviewHarness initialContainerMode="page" />
      </div>
    </ScePreviewPitchCanvas>
  );
}
