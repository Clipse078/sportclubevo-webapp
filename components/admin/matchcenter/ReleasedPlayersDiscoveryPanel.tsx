"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { Button } from "@/components/ui/Button";
import { SceFeatureCard } from "@/components/sce/workspace/SceFeatureCard";
import { SceWorkspaceSection } from "@/components/sce/workspace/SceWorkspaceSection";
import { OPERATIONAL_ACTION_ACCENT_CLASS } from "@/components/ui/operational-action-button-classes";

export type ReleasedPlayerDiscoveryRow = {
  releaseId: string;
  personDisplayName: string;
  sourceTeamLabel: string;
  releaseReason: string;
  maxMinutesLabel: string | null;
  validityLabel: string;
  suitabilityLabel: string;
  availabilityLabel: string;
  availabilityTone: "success" | "danger" | "warning" | "muted";
  conflictHints: { level: string; message: string }[];
  request: {
    id: string;
    status: string;
    statusLabel: string;
    version: string;
  } | null;
  canRequest: boolean;
  requestBlockedReason: string | null;
};

type Payload = {
  canRequest: boolean;
  players: ReleasedPlayerDiscoveryRow[];
  error?: string;
};

type Props = {
  eventId: string;
  variant: "match" | "tournament";
  canMutateSquad: boolean;
};

function releasedPlayersApiPath(eventId: string, variant: "match" | "tournament"): string {
  return variant === "tournament"
    ? `/api/tournamentcenter/${eventId}/released-players`
    : `/api/matchcenter/${eventId}/released-players`;
}

function cancelApiPath(eventId: string, requestId: string, variant: "match" | "tournament"): string {
  return variant === "tournament"
    ? `/api/tournamentcenter/${eventId}/player-release-requests/${requestId}/cancel`
    : `/api/matchcenter/${eventId}/player-release-requests/${requestId}/cancel`;
}

export default function ReleasedPlayersDiscoveryPanel({ eventId, variant, canMutateSquad }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [actingReleaseId, setActingReleaseId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(releasedPlayersApiPath(eventId, variant), { cache: "no-store" });
      const json = (await response.json()) as Payload;
      if (!response.ok) {
        throw new Error(json.error ?? "Freigegebene Spieler konnten nicht geladen werden.");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [eventId, variant]);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  async function submitRequest(releaseId: string) {
    setActingReleaseId(releaseId);
    setError(null);
    try {
      const response = await fetch(releasedPlayersApiPath(eventId, variant), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerReleaseId: releaseId }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Anfrage fehlgeschlagen.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anfrage fehlgeschlagen.");
    } finally {
      setActingReleaseId(null);
    }
  }

  async function cancelRequest(requestId: string, version: string) {
    setActingReleaseId(requestId);
    setError(null);
    try {
      const response = await fetch(cancelApiPath(eventId, requestId, variant), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: version }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Zurückziehen fehlgeschlagen.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zurückziehen fehlgeschlagen.");
    } finally {
      setActingReleaseId(null);
    }
  }

  const canRequest = Boolean(data?.canRequest && canMutateSquad);

  return (
    <SceWorkspaceSection
      className="mt-4"
      testId="released-players-discovery"
      title="Freigegebene Spieler finden"
      description="Explizit freigegebene Spieler anderer Teams für diese Aktivität anfragen."
      icon={Users}
    >
      {!open ? (
        <Button
          type="button"
          variant="secondary"
          className={OPERATIONAL_ACTION_ACCENT_CLASS}
          onClick={() => setOpen(true)}
          data-testid="released-players-discovery-open"
        >
          Freigegebene Spieler finden
        </Button>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Freigaben werden geladen…
            </div>
          ) : null}
          {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
          {!loading && data && data.players.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Derzeit sind keine Spieler explizit für dieses Team freigegeben.
            </p>
          ) : null}
          <ul className="grid gap-3">
            {(data?.players ?? []).map((player) => (
              <li key={player.releaseId}>
                <SceFeatureCard title={player.personDisplayName} className="p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-[var(--muted)]">Stammteam: {player.sourceTeamLabel}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Freigabe: {player.releaseReason}
                        {player.maxMinutesLabel ? ` · ${player.maxMinutesLabel}` : ""} · {player.validityLabel}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <AdminStatusPill tone="muted" label={player.suitabilityLabel} />
                        <AdminStatusPill
                          tone={
                            player.availabilityTone === "success"
                              ? "success"
                              : player.availabilityTone === "danger"
                                ? "default"
                                : player.availabilityTone === "warning"
                                  ? "warning"
                                  : "muted"
                          }
                          label={player.availabilityLabel}
                        />
                        {player.request ? (
                          <AdminStatusPill
                            tone={
                              player.request.status === "APPROVED"
                                ? "success"
                                : player.request.status === "PENDING"
                                  ? "warning"
                                  : "muted"
                            }
                            label={player.request.statusLabel}
                          />
                        ) : null}
                      </div>
                      {player.conflictHints.map((hint) => (
                        <p
                          key={`${player.releaseId}-${hint.message}`}
                          className={`text-xs ${hint.level === "HARD" ? "text-[var(--destructive)]" : "text-[var(--muted)]"}`}
                        >
                          {hint.message}
                        </p>
                      ))}
                      {player.requestBlockedReason && !player.request ? (
                        <p className="text-xs text-[var(--muted)]">{player.requestBlockedReason}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {player.request?.status === "PENDING" && canRequest ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={actingReleaseId === player.request.id}
                          onClick={() => void cancelRequest(player.request!.id, player.request!.version)}
                        >
                          Zurückziehen
                        </Button>
                      ) : null}
                      {!player.request && player.canRequest && canRequest ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={OPERATIONAL_ACTION_ACCENT_CLASS}
                          disabled={actingReleaseId === player.releaseId}
                          onClick={() => void submitRequest(player.releaseId)}
                          data-testid={`released-player-request-${player.releaseId}`}
                        >
                          Anfragen
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </SceFeatureCard>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SceWorkspaceSection>
  );
}
