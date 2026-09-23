"use client";

import { useCallback, useEffect, useState } from "react";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  WORKSPACE_BREAK_GLASS_DEFAULT_TTL_MINUTES,
  WORKSPACE_BREAK_GLASS_MAX_TTL_MINUTES,
  WORKSPACE_BREAK_GLASS_MIN_TTL_MINUTES,
} from "@/lib/workspace/governance/break-glass-constants";

type ActiveSession = {
  id: string;
  scopeType: string;
  workspaceDocumentId: string | null;
  workspaceFolderId: string | null;
  reason: string;
  expiresAt: string;
  createdAt: string;
};

export function BreakGlassGovernancePanel() {
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [scopeType, setScopeType] = useState<"DOCUMENT" | "FOLDER_SUBTREE">(
    "DOCUMENT",
  );
  const [resourceId, setResourceId] = useState("");
  const [reason, setReason] = useState("");
  const [ttlMinutes, setTtlMinutes] = useState(
    String(WORKSPACE_BREAK_GLASS_DEFAULT_TTL_MINUTES),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshActive = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/governance/break-glass/active");
      const data = (await res.json()) as { session: ActiveSession | null };
      setActive(data.session ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshActive();
  }, [refreshActive]);

  async function handleActivate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const validateRes = await fetch(
        "/api/workspace/governance/break-glass/validate-target",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scopeType,
            documentId: scopeType === "DOCUMENT" ? resourceId.trim() : undefined,
            folderId:
              scopeType === "FOLDER_SUBTREE" ? resourceId.trim() : undefined,
          }),
        },
      );
      if (!validateRes.ok) {
        setError(
          "Ziel-Ressource wurde in diesem Mandanten nicht gefunden (keine Metadaten preisgegeben).",
        );
        return;
      }

      const activateRes = await fetch(
        "/api/workspace/governance/break-glass/activate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scopeType,
            documentId: scopeType === "DOCUMENT" ? resourceId.trim() : undefined,
            folderId:
              scopeType === "FOLDER_SUBTREE" ? resourceId.trim() : undefined,
            reason,
            ttlMinutes: Number(ttlMinutes),
            confirm: true,
          }),
        },
      );
      const activateData = (await activateRes.json()) as {
        error?: string;
      };
      if (!activateRes.ok) {
        setError(activateData.error ?? "Aktivierung fehlgeschlagen.");
        return;
      }
      setMessage(
        "Ausserordentlicher Lesezugriff ist aktiv. Nutzen Sie nur explizit freigegebene Lese-Operationen innerhalb des definierten Umfangs.",
      );
      setReason("");
      await refreshActive();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd() {
    if (!active) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/governance/break-glass/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: active.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Beenden fehlgeschlagen.");
        return;
      }
      setMessage("Break-Glass Zugriff beendet.");
      setActive(null);
      await refreshActive();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 rounded-lg border border-amber-500/40 bg-amber-500/5 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold text-amber-950">
            Ausserordentlicher Workspace-Zugriff (Break-Glass)
          </h2>
          <p className="text-sm text-muted-foreground">
            Nur für dokumentierte Governance-Fälle. Temporärer, auditierter
            Lesezugriff auf eine explizit angegebene Ressourcen-ID — kein
            Ersatz für normale Berechtigungen und keine dauerhafte Admin-Rolle.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Lade Sitzungsstatus…</p>
      ) : active ? (
        <div className="space-y-3 rounded-md border border-amber-600/30 bg-background p-4">
          <p className="font-medium text-amber-900">Aktive Ausnahmesitzung</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              <span className="font-medium text-foreground">Umfang:</span>{" "}
              {active.scopeType}
            </li>
            <li>
              <span className="font-medium text-foreground">Ressource:</span>{" "}
              {active.workspaceDocumentId ?? active.workspaceFolderId}
            </li>
            <li>
              <span className="font-medium text-foreground">Läuft ab:</span>{" "}
              {new Date(active.expiresAt).toLocaleString("de-CH")}
            </li>
            <li>
              <span className="font-medium text-foreground">Grund:</span>{" "}
              {active.reason}
            </li>
          </ul>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleEnd()}
          >
            Zugriff beenden
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void handleActivate(e)}>
          <div className="grid gap-2">
            <label htmlFor="bg-scope" className="text-sm font-medium">
              Umfangstyp
            </label>
            <select
              id="bg-scope"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={scopeType}
              onChange={(e) =>
                setScopeType(e.target.value as "DOCUMENT" | "FOLDER_SUBTREE")
              }
            >
              <option value="DOCUMENT">Einzelnes Dokument (ID)</option>
              <option value="FOLDER_SUBTREE">Ordner-Unterbaum (ID)</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="bg-resource" className="text-sm font-medium">
              Kanoniche Ressourcen-ID
            </label>
            <input
              id="bg-resource"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              placeholder="Aus Governance-/Support-Vorgang"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="bg-reason" className="text-sm font-medium">
              Begründung (Pflicht)
            </label>
            <textarea
              id="bg-reason"
              className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="grid gap-2 max-w-xs">
            <label htmlFor="bg-ttl" className="text-sm font-medium">
              Dauer (Minuten, {WORKSPACE_BREAK_GLASS_MIN_TTL_MINUTES}–
              {WORKSPACE_BREAK_GLASS_MAX_TTL_MINUTES})
            </label>
            <input
              id="bg-ttl"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              type="number"
              min={WORKSPACE_BREAK_GLASS_MIN_TTL_MINUTES}
              max={WORKSPACE_BREAK_GLASS_MAX_TTL_MINUTES}
              value={ttlMinutes}
              onChange={(e) => setTtlMinutes(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={submitting}>
            Ausserordentlichen Zugriff aktivieren
          </Button>
        </form>
      )}

      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
