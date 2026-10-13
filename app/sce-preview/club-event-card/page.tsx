"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { SceClubEventCardPreviewGallery } from "@/components/sporting-activity/SceClubEventCardPreviewGallery";

export default function SceClubEventCardPreviewPage() {
  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-club-event-card">
      <SceClubEventCardPreviewGallery />
    </ScePreviewPitchCanvas>
  );
}
