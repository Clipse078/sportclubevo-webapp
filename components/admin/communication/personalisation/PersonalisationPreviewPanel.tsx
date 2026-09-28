"use client";

import { useState } from "react";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";

type PreviewRecipient = { personId: string; displayName: string };

type Props = {
  subject: string;
  bodyText: string;
  contextRef: CommunicationContextRef;
  audience?: CommunicationAudienceSpec;
  recipients: PreviewRecipient[];
  communicationKind?: string;
};

export function PersonalisationPreviewPanel({
  subject,
  bodyText,
  contextRef,
  audience,
  recipients,
  communicationKind,
}: Props) {
  const [selectedId, setSelectedId] = useState(recipients[0]?.personId ?? "");
  const [result, setResult] = useState<{
    renderedSubject: string | null;
    renderedBodyText: string;
    contextSummary: string | null;
    blocksSend: boolean;
    warnings: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function runPreview(personId: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/communication/personalisation/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          bodyText,
          contextRef,
          audience,
          subjectPersonId: personId,
          communicationKind,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vorschau fehlgeschlagen");
      const mapDiagnostic = (d: { labelDe: string; messageDe?: string; outcome: string }) =>
        d.messageDe ? `${d.labelDe}: ${d.messageDe}` : d.labelDe;
      const warnings = [
        ...(data.subjectDiagnostics ?? [])
          .filter((d: { outcome: string }) => d.outcome !== "RESOLVED")
          .map(mapDiagnostic),
        ...(data.bodyDiagnostics ?? [])
          .filter((d: { outcome: string }) => d.outcome !== "RESOLVED")
          .map(mapDiagnostic),
      ];
      setResult({
        renderedSubject: data.renderedSubject,
        renderedBodyText: data.renderedBodyText,
        contextSummary: data.contextSummary,
        blocksSend: data.blocksSend,
        warnings,
      });
    } catch (e) {
      setResult({
        renderedSubject: subject,
        renderedBodyText: bodyText,
        contextSummary: null,
        blocksSend: true,
        warnings: [e instanceof Error ? e.message : "Vorschau fehlgeschlagen"],
      });
    } finally {
      setBusy(false);
    }
  }

  if (recipients.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Vorschau als:</span>
        <select
          className="rounded-md border border-[var(--border)] px-2 py-1 text-sm"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {recipients.map((r) => (
            <option key={r.personId} value={r.personId}>
              {r.displayName}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !selectedId}
          className="rounded-md bg-[var(--sce-primary)] px-3 py-1 text-sm text-white"
          onClick={() => void runPreview(selectedId)}
        >
          Vorschau aktualisieren
        </button>
      </div>
      {result?.contextSummary ? (
        <p className="mb-2 text-xs text-[var(--muted-foreground)]">
          Kontext: {result.contextSummary}
        </p>
      ) : null}
      {result ? (
        <div className="space-y-2 text-sm">
          {result.renderedSubject ? (
            <p>
              <span className="font-medium">Betreff: </span>
              {result.renderedSubject}
            </p>
          ) : null}
          <pre className="whitespace-pre-wrap rounded-md bg-[var(--muted)] p-3">
            {result.renderedBodyText}
          </pre>
          {result.warnings.length > 0 ? (
            <ul className="list-disc pl-5 text-amber-700">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {result.blocksSend ? (
            <p className="text-red-600">Versand würde blockiert (fehlende/kritische Felder).</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          Wählen Sie einen Empfänger und aktualisieren Sie die Vorschau.
        </p>
      )}
    </div>
  );
}
