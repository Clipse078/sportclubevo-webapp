"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Users } from "lucide-react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { Button } from "@/components/ui/Button";
import { SceFeatureCard } from "@/components/sce/workspace/SceFeatureCard";
import { SceWorkspaceSection } from "@/components/sce/workspace/SceWorkspaceSection";

type InboundReleaseRow = {
  releaseId: string;
  personDisplayName: string;
  sourceTeamLabel: string;
  releaseReason: string;
  maxMinutesLabel: string | null;
  validityLabel: string;
  request: {
    id: string;
    status: string;
    statusLabel: string;
    assigned: boolean;
    operationalLabel: string;
    operationalSecondaryLabel: string | null;
    operationalTone: "success" | "warning" | "muted" | "danger" | "default";
  } | null;
};

type Payload = {
  actionableCount: number;
  releases: InboundReleaseRow[];
};

type Props = {
  teamId: string;
  teamSeasonId: string;
  highlightFromDeepLink?: boolean;
};

export default function TeamInboundPlayerReleaseSection({
  teamId,
  teamSeasonId,
  highlightFromDeepLink = false,
}: Props) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [expanded, setExpanded] = useState(false);

  const apiBase = `/api/teams/${teamId}/team-seasons/${teamSeasonId}/inbound-player-releases`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiBase, { cache: "no-store" });
      const json = (await response.json()) as Payload & { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Freigegebene Spieler konnten nicht geladen werden.");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (highlightFromDeepLink && (data?.actionableCount ?? 0) > 0) {
      setExpanded(true);
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [highlightFromDeepLink, data?.actionableCount]);

  useEffect(() => {
    if (!expanded || !data?.actionableCount) return;
    void fetch(apiBase, { method: "POST" }).catch(() => undefined);
  }, [expanded, data?.actionableCount, apiBase]);

  const countLabel = useMemo(() => {
    const count = data?.actionableCount ?? 0;
    if (count === 0) return null;
    return count === 1 ? "1 freigegebener Spieler" : `${count} freigegebene Spieler`;
  }, [data?.actionableCount]);

  if (!loading && !error && (data?.actionableCount ?? 0) === 0) {
    return null;
  }

  return (
    <div ref={sectionRef} id="freigegebene-spieler-inbound" data-testid="inbound-player-releases">
      <SceWorkspaceSection
        title={countLabel ? `Freigegebene Spieler · ${countLabel}` : "Freigegebene Spieler"}
        description="Spieler, die andere Teams explizit für euer Team freigegeben haben."
        icon={Users}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Lade Freigaben…
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && !error && data ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[var(--muted)]">
                {countLabel ?? "Freigegebene Spieler verfügbar"}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="inbound-player-releases-toggle"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? "Ausblenden" : "Freigegebene Spieler ansehen"}
              </Button>
            </div>

            {expanded ? (
              <div className="space-y-2">
                {data.releases.map((row) => (
                  <SceFeatureCard key={row.releaseId} title={row.personDisplayName} className="p-3">
                    <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                      <p>
                        <span className="text-[var(--foreground)]">Stammteam:</span>{" "}
                        {row.sourceTeamLabel}
                      </p>
                      <p>
                        <span className="text-[var(--foreground)]">Zweck:</span> {row.releaseReason}
                      </p>
                      <p>
                        <span className="text-[var(--foreground)]">Gültigkeit:</span>{" "}
                        {row.validityLabel}
                      </p>
                      {row.maxMinutesLabel ? (
                        <p>
                          <span className="text-[var(--foreground)]">Einsatz:</span>{" "}
                          {row.maxMinutesLabel}
                        </p>
                      ) : null}
                    </div>
                    {row.request ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <AdminStatusPill
                          label={row.request.operationalLabel}
                          tone={
                            row.request.operationalTone === "success"
                              ? "success"
                              : row.request.operationalTone === "muted"
                                ? "muted"
                                : row.request.operationalTone === "warning" ||
                                    row.request.operationalTone === "danger"
                                  ? "warning"
                                  : "default"
                          }
                        />
                        {row.request.operationalSecondaryLabel ? (
                          <span className="text-xs text-[var(--muted)]">
                            {row.request.operationalSecondaryLabel}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </SceFeatureCard>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Die Spieler können für kommende Einsätze angefragt werden (Match/Tournament Aufgebot →
                Freigegebene Spieler finden).
              </p>
            )}
          </div>
        ) : null}
      </SceWorkspaceSection>
    </div>
  );
}
