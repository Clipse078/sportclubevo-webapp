"use client";

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
    <div className="mx-auto max-w-5xl p-6" data-testid="sce-preview-matchcenter-row">
      <p className="mb-4 text-sm text-[var(--muted)]">
        Integration preview — Matchcenter Spielplanung row (COMPACT `SceMatchCard` list-row +
        operational readiness column unchanged).
      </p>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <SpieleManagementMatchRow
          match={match}
          assessment={assessment}
          locale="de-CH"
          timezone="Europe/Zurich"
          tenantClubName="FC Allschwil"
          canManage={false}
        />
      </div>
    </div>
  );
}
