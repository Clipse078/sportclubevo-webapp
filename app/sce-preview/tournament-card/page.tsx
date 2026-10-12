"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { SceTournamentCardPreviewGallery } from "@/components/sporting-activity/SceTournamentCardPreviewGallery";

export default function SceTournamentCardPreviewPage() {
  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-tournament-card">
      <SceTournamentCardPreviewGallery />
    </ScePreviewPitchCanvas>
  );
}
