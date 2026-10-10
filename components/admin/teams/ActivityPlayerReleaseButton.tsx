"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import PlayerReleaseEditorSheet, {
  type PlayerReleaseEditorContext,
} from "@/components/admin/teams/PlayerReleaseEditorSheet";

type Props = {
  teamId: string;
  teamSeasonId: string;
  personId: string;
  personDisplayName: string;
  canManage: boolean;
  activityContext: PlayerReleaseEditorContext & { mode: "ACTIVITY" };
  disabled?: boolean;
  testId?: string;
};

export default function ActivityPlayerReleaseButton({
  teamId,
  teamSeasonId,
  personId,
  personDisplayName,
  canManage,
  activityContext,
  disabled = false,
  testId,
}: Props) {
  const [open, setOpen] = useState(false);
  const apiBase = `/api/teams/${teamId}/team-seasons/${teamSeasonId}/player-releases`;

  if (!canManage) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-3)] disabled:opacity-50"
        data-testid={testId ?? `player-release-action-${personId}`}
        aria-label={`${personDisplayName} für anderes Team freigeben`}
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        Freigeben
      </button>
      <PlayerReleaseEditorSheet
        open={open}
        onClose={() => setOpen(false)}
        apiBase={apiBase}
        editing={null}
        initialPersonId={personId}
        initialPersonDisplayName={personDisplayName}
        rosterPlayers={[{ personId, displayName: personDisplayName }]}
        context={activityContext}
        onSaved={() => setOpen(false)}
      />
    </>
  );
}
