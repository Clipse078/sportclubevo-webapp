"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { SceTrainingCardPreviewGallery } from "@/components/sporting-activity/SceTrainingCardPreviewGallery";

export default function SceTrainingCardPreviewPage() {
  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-training-card">
      <SceTrainingCardPreviewGallery />
    </ScePreviewPitchCanvas>
  );
}
