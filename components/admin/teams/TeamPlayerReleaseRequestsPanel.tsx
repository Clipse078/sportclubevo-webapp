"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { Button } from "@/components/ui/Button";
import { SceWorkspaceSection } from "@/components/sce/workspace/SceWorkspaceSection";
import { SceFeatureCard } from "@/components/sce/workspace/SceFeatureCard";
import type { PlayerReleaseRequestView } from "@/lib/match-squad/player-release-request-service";
import { Inbox } from "lucide-react";

type Props = {
  teamId: string;
  teamSeasonId: string;
  canDecide: boolean;
};

export default function TeamPlayerReleaseRequestsPanel({
  teamId,
  teamSeasonId,
  canDecide,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<PlayerReleaseRequestView[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const apiBase = `/api/teams/${teamId}/team-seasons/${teamSeasonId}/player-release-requests`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiBase);
      const json = (await response.json()) as {
        requests: PlayerReleaseRequestView[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Anfragen konnten nicht geladen werden.");
      }
      setRequests(json.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(request: PlayerReleaseRequestView, decision: "APPROVE" | "REJECT") {
    setActingId(request.id);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/${request.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          expectedVersion: request.version,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Entscheidung fehlgeschlagen.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entscheidung fehlgeschlagen.");
    } finally {
      setActingId(null);
    }
  }

  if (!loading && requests.length === 0) {
    return null;
  }

  return (
    <SceWorkspaceSection
      className="mt-6"
      testId="player-release-requests-source"
      title="Anfragen für freigegebene Spieler"
      description="Offene Anfragen anderer Teams zu Ihren Spielerfreigaben."
      icon={Inbox}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Anfragen werden geladen…
        </div>
      ) : null}
      {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
      <ul className="grid gap-3">
        {requests.map((request) => (
          <li key={request.id}>
            <SceFeatureCard title={request.personDisplayName} className="p-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-[var(--muted)]">
                    Anfragendes Team: {request.targetTeamLabel}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Aktivität: {request.targetEventTitle} ({new Date(request.targetEventStartAt).toLocaleString("de-CH")})
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Freigabe: {request.releaseReasonLabel}
                    {request.releaseMaxMinutes != null ? ` · Max. ${request.releaseMaxMinutes} Min.` : ""}
                    {request.requestedMinutes != null ? ` · Gewünscht: ${request.requestedMinutes} Min.` : ""}
                  </p>
                  <AdminStatusPill tone="warning" label={request.statusLabel} />
                </div>
                {canDecide && request.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={actingId === request.id}
                      onClick={() => void decide(request, "APPROVE")}
                      data-testid={`release-request-approve-${request.id}`}
                    >
                      Genehmigen
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={actingId === request.id}
                      onClick={() => void decide(request, "REJECT")}
                      data-testid={`release-request-reject-${request.id}`}
                    >
                      Ablehnen
                    </Button>
                  </div>
                ) : null}
              </div>
            </SceFeatureCard>
          </li>
        ))}
      </ul>
    </SceWorkspaceSection>
  );
}
