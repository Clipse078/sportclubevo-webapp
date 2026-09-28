"use client";

import { useState } from "react";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { previewZielgruppeRecipientsAction } from "@/app/(admin)/dashboard/communication/zielgruppen/actions";
import {
  ZIELGRUPPE_MEMBERSHIP_NOT_CONSENT_NOTICE,
  ZIELGRUPPE_PREVIEW_DELIVERY_NOTICE,
} from "@/lib/communication/zielgruppen/zielgruppen-display";

type Props = {
  definition: ZielgruppeEditorDefinition;
  disabled?: boolean;
};

export default function ZielgruppePreviewPanel({ definition, disabled }: Props) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewStats, setPreviewStats] = useState<{
    candidates: number;
    excluded: number;
    effective: number;
    scopeNotice: string | null;
    recipients: Array<{ personId: string; displayName: string }>;
  } | null>(null);

  return (
    <section
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4"
      aria-label="Empfänger Vorschau"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Empfänger-Vorschau</h3>
          <p className="text-xs leading-5 text-[var(--text-2)]">{ZIELGRUPPE_PREVIEW_DELIVERY_NOTICE}</p>
          <p className="text-[11px] leading-5 text-[var(--muted)]">
            {ZIELGRUPPE_MEMBERSHIP_NOT_CONSENT_NOTICE}
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
          disabled={disabled || previewLoading}
          aria-busy={previewLoading}
          onClick={async () => {
            setPreviewLoading(true);
            setPreviewError(null);
            const result = await previewZielgruppeRecipientsAction({ definition });
            setPreviewLoading(false);
            if (!result.ok) {
              setPreviewError(result.message);
              setPreviewStats(null);
              return;
            }
            setPreviewStats({
              candidates: result.data.candidates,
              excluded: result.data.excluded,
              effective: result.data.effective,
              scopeNotice: result.data.scopeNotice,
              recipients: result.data.recipients,
            });
          }}
        >
          {previewLoading ? "Wird berechnet…" : "Vorschau aktualisieren"}
        </button>
      </div>

      {previewError ? (
        <p className="mt-3 text-xs text-red-600" role="alert">
          {previewError}
        </p>
      ) : null}

      {previewStats ? (
        <div
          className="mt-3 space-y-2 text-xs text-[var(--text-2)]"
          role="status"
          aria-live="polite"
        >
          <p>
            Kandidaten: {previewStats.candidates} · Ausgeschlossen: {previewStats.excluded} ·
            Aufgelöst: {previewStats.effective}
          </p>
          {previewStats.scopeNotice ? (
            <p className="text-[var(--muted)]">{previewStats.scopeNotice}</p>
          ) : null}
          {previewStats.recipients.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto rounded border border-[var(--border)] bg-[var(--surface-1)] p-2">
              {previewStats.recipients.map((r) => (
                <li key={r.personId}>{r.displayName}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--muted)]">
              Keine Empfänger im aktuellen Berechtigungsumfang.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Vorschau wird erst nach Klick berechnet — nicht bei jeder Eingabe.
        </p>
      )}
    </section>
  );
}
