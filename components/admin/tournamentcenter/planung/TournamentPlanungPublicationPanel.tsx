"use client";

import TournamentPublicationToggles, {
  type TournamentPublicationState,
} from "@/components/admin/tournamentcenter/TournamentPublicationToggles";
import PlanningPublicationPanel from "@/components/admin/shared/planning-editor/PlanningPublicationPanel";
import PublicTournamentCopyLinkButton from "@/components/public/tournament/PublicTournamentCopyLinkButton";
import { buildPublicTournamentPath } from "@/lib/tournaments/public/build-public-tournament-url";
import { resolveTournamentPublicationPresentation } from "@/lib/tournaments/management-view";
import type { TournamentDto } from "@/lib/tournaments/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type Props = {
  tournament: Pick<
    TournamentDto,
    "id" | "visibility" | "updatedAt" | "homeAway" | "organizerName"
  >;
  tenantKey: string;
  canManage: boolean;
  ownershipAllowsPublication: boolean;
};

export default function TournamentPlanungPublicationPanel({
  tournament,
  tenantKey,
  canManage,
  ownershipAllowsPublication,
}: Props) {
  const { toast } = useToast();
  const [publication, setPublication] = useState<TournamentPublicationState>(tournament.visibility);
  const [saving, setSaving] = useState(false);

  const presentation = resolveTournamentPublicationPresentation({ visibility: publication });
  const publicPath = buildPublicTournamentPath(tenantKey, tournament.id);
  const absolutePublicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${publicPath}`
      : publicPath;

  async function savePublication(next: TournamentPublicationState) {
    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...next,
          expectedEventUpdatedAt: tournament.updatedAt,
        }),
      });
      const json = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        if (res.status === 409) {
          toast.danger("Publikation wurde zwischenzeitlich geändert. Bitte Seite aktualisieren.");
          return;
        }
        throw new Error(json.error ?? "Speichern fehlgeschlagen");
      }
      setPublication(next);
      toast.success("Publikation gespeichert.");
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PlanningPublicationPanel testId="tournament-planung-publication-panel">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--text-2)]">
            Status: <span className="font-medium text-[var(--foreground)]">{presentation.label}</span>
          </p>
          {!ownershipAllowsPublication ? (
            <p className="text-xs text-[var(--sce-warning)]" role="status">
              Publikation über den Turnierplaner ist nur für eigenorganisierte Turniere verfügbar.
            </p>
          ) : null}
        </div>
        <TournamentPublicationToggles
          value={publication}
          onChange={(patch) => {
            const next = { ...publication, ...patch };
            setPublication(next);
            if (canManage && ownershipAllowsPublication) {
              void savePublication(next);
            }
          }}
          disabled={!canManage || !ownershipAllowsPublication || saving}
          testIdPrefix="tournament-planung-publication"
          showHeading={false}
        />
        {publication.websiteVisible ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Öffentlicher Link
            </p>
            <p className="mb-3 break-all font-mono text-xs text-[var(--text-2)]">{publicPath}</p>
            <PublicTournamentCopyLinkButton absoluteUrl={absolutePublicUrl} />
          </div>
        ) : null}
      </div>
    </PlanningPublicationPanel>
  );
}
