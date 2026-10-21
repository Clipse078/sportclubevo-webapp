"use client";

/**
 * Client component that triggers SFV competition synchronization via API.
 * Secondary operational action — not a page hero CTA (DS-10 R1).
 */

import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type SyncResult = {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  archived: number;
  failed: number;
  durationMs: number;
};

export default function CompetitionsSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/integrations/sfv/competitions/sync", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
        return;
      }

      const data = (await res.json()) as { result: SyncResult };
      setResult(data.result);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid="competitions-sync">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
        data-sce-action-hierarchy="SECONDARY"
        className="whitespace-nowrap"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden />
        {syncing ? "Synchronisierung läuft…" : "SFV synchronisieren"}
      </Button>

      {result ? (
        <div
          className="flex items-start gap-2 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200/95"
          role="status"
        >
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {result.fetched} Wettkämpfe verarbeitet — {result.created} erstellt, {result.updated}{" "}
            aktualisiert, {result.unchanged} unverändert
            {result.archived > 0 ? `, ${result.archived} archiviert` : ""}
            {result.failed > 0 ? ` (${result.failed} Fehler)` : ""} ({result.durationMs} ms)
          </span>
        </div>
      ) : null}

      {error ? (
        <div
          className="flex items-start gap-2 rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200/95"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
