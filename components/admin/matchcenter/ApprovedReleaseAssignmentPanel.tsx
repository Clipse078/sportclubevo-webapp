"use client";

import { useState } from "react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import MatchAvailabilityStatusBadge from "@/components/admin/matchcenter/MatchAvailabilityStatusBadge";
import { Button } from "@/components/ui/Button";
import { SceWorkspaceSection } from "@/components/sce/workspace/SceWorkspaceSection";
import { OPERATIONAL_ACTION_ACCENT_CLASS } from "@/components/ui/operational-action-button-classes";
import type { ApprovedReleaseAssignmentCandidate } from "@/lib/match-squad/player-release-assignment-candidates";
import { UserCheck } from "lucide-react";

type Props = {
  eventId: string;
  variant: "match" | "tournament";
  canMutateSquad: boolean;
  candidates: ApprovedReleaseAssignmentCandidate[];
  onAssigned: () => void;
};

function assignApiPath(
  eventId: string,
  requestId: string,
  variant: "match" | "tournament",
): string {
  return variant === "tournament"
    ? `/api/tournamentcenter/${eventId}/player-release-requests/${requestId}/assign`
    : `/api/matchcenter/${eventId}/player-release-requests/${requestId}/assign`;
}

export default function ApprovedReleaseAssignmentPanel({
  eventId,
  variant,
  canMutateSquad,
  candidates,
  onAssigned,
}: Props) {
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (candidates.length === 0) {
    return null;
  }

  async function assignOne(requestId: string) {
    setActingId(requestId);
    setError(null);
    try {
      const response = await fetch(assignApiPath(eventId, requestId, variant), {
        method: "POST",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Aufbieten fehlgeschlagen.");
      }
      onAssigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aufbieten fehlgeschlagen.");
    } finally {
      setActingId(null);
    }
  }

  const canAssign = canMutateSquad;

  return (
    <SceWorkspaceSection
      className="mt-4"
      testId="approved-release-assignment"
      title={`Genehmigte Freigaben · ${candidates.length}`}
      description="Freigegebene Spieler anderer Teams — explizit aufbieten."
      icon={UserCheck}
    >
      {error ? (
        <p className="mb-2 text-sm text-[var(--destructive)]" data-testid="approved-release-error">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {candidates.map((row) => (
          <li
            key={row.requestId}
            className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:flex-row sm:items-center sm:justify-between"
            data-testid={`approved-release-row-${row.requestId}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">{row.personDisplayName}</p>
              <p className="text-xs text-[var(--muted)]">{row.sourceTeamLabel}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <AdminStatusPill tone="success" label={row.statusLabel} />
                <MatchAvailabilityStatusBadge
                  label={row.availabilityLabel}
                  tone={row.availabilityTone}
                  icon="circle"
                />
              </div>
              {row.assignBlockedReason ? (
                <p className="mt-1 text-xs text-[var(--destructive)]">{row.assignBlockedReason}</p>
              ) : row.assignWarning ? (
                <p className="mt-1 text-xs text-[var(--warning)]">{row.assignWarning}</p>
              ) : null}
            </div>
            {canAssign && row.canAssign ? (
              <Button
                type="button"
                variant="secondary"
                className={OPERATIONAL_ACTION_ACCENT_CLASS}
                disabled={actingId === row.requestId}
                onClick={() => void assignOne(row.requestId)}
                data-testid={`approved-release-assign-${row.requestId}`}
              >
                Aufbieten
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </SceWorkspaceSection>
  );
}
