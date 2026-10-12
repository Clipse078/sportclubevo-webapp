"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import SpieleManagementMatchRow from "@/components/admin/matchcenter/SpieleManagementMatchRow";
import { assessMatchOperationalState } from "@/lib/matchcenter/operational-state";
import { createSceMatchCardFixtureMatch } from "@/components/sporting-activity/__fixtures__/sce-match-card-fixtures";

export default function SceMatchcenterRowPreviewPage() {
  const match = createSceMatchCardFixtureMatch({
    id: "preview-matchcenter-row",
    homeAway: "HOME",
    competitionLabel: "2. Liga – Meisterschaft",
    location: "Sportanlage Engelberg",
    operational: {
      pitchCode: "Hauptfeld",
      homeDressingRoomCode: "H1",
      awayDressingRoomCode: "A1",
      meetingTime: null,
      remarks: null,
    },
  });
  const assessment = assessMatchOperationalState(match);

  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-matchcenter-row">
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm text-[var(--muted)]">
        Integration preview — Matchcenter Spielplanung (bounded canonical card + operational panel).
      </p>
      <SpieleManagementMatchRow
          match={match}
          assessment={assessment}
          locale="de-CH"
          timezone="Europe/Zurich"
          tenantClubName="FC Allschwil"
          canManage={false}
        />
    </div>
    </ScePreviewPitchCanvas>
  );
}
