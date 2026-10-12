"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import SpieleManagementResultRow from "@/components/admin/matchcenter/SpieleManagementResultRow";
import { createSceMatchCardFixtureMatch } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";

export default function SceMatchcenterResultateRowPreviewPage() {
  const match = createSceMatchCardFixtureMatch({
    id: "preview-matchcenter-result",
    status: "COMPLETED",
    scoreHome: 2,
    scoreAway: 1,
    competitionLabel: "2. Liga – Meisterschaft",
  });

  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-matchcenter-result-row">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-sm text-[var(--muted)]">
          Integration preview — Matchcenter Resultate row (STANDARD `SceMatchCard`).
        </p>
        <SpieleManagementResultRow
          match={match}
          locale="de-CH"
          timezone="Europe/Zurich"
          tenantClubName="FC Allschwil"
          canManage={false}
        />
      </div>
    </ScePreviewPitchCanvas>
  );
}
