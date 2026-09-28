"use client";

import { useEffect, useState } from "react";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { previewZielgruppeRecipientsAction } from "@/app/(admin)/dashboard/communication/zielgruppen/actions";
import {
  ZIELGRUPPE_DYNAMIC_MEMBERSHIP_NOTICE,
  ZIELGRUPPE_MEMBERSHIP_NOT_CONSENT_NOTICE,
  ZIELGRUPPE_PREVIEW_DELIVERY_NOTICE,
} from "@/lib/communication/zielgruppen/zielgruppen-display";
import { zielgruppeDefinitionIsEmpty } from "@/lib/communication/zielgruppen/editor-model";

type Props = {
  definition: ZielgruppeEditorDefinition;
  disabled?: boolean;
  /** When true, refresh preview automatically after definition changes (debounced). */
  live?: boolean;
};

const PREVIEW_DEBOUNCE_MS = 450;

export default function ZielgruppePreviewPanel({ definition, disabled, live = false }: Props) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewStats, setPreviewStats] = useState<{
    candidates: number;
    excluded: number;
    effective: number;
    scopeNotice: string | null;
    recipients: Array<{ personId: string; displayName: string }>;
    hasMore: boolean;
  } | null>(null);
  async function runPreview(forDefinition: ZielgruppeEditorDefinition) {
    setPreviewLoading(true);
    setPreviewError(null);
    const result = await previewZielgruppeRecipientsAction({ definition: forDefinition });
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
      hasMore: result.data.hasMore,
    });
  }

  const definitionHasRules =
    definition.wholeOrganisation || !zielgruppeDefinitionIsEmpty(definition);

  useEffect(() => {
    if (!live || !definitionHasRules) return undefined;
    const handle = setTimeout(() => {
      void runPreview(definition);
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [live, definition, definitionHasRules]);

  const remaining =
    previewStats && previewStats.hasMore
      ? Math.max(0, previewStats.effective - previewStats.recipients.length)
      : 0;

  return (
    <section
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 lg:sticky lg:top-4"
      aria-label="Live-Vorschau"
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Live-Vorschau</h3>
        <p className="text-xs leading-5 text-[var(--text-2)]">{ZIELGRUPPE_PREVIEW_DELIVERY_NOTICE}</p>
        <p className="text-[11px] leading-5 text-[var(--muted)]">
          {ZIELGRUPPE_DYNAMIC_MEMBERSHIP_NOTICE}
        </p>
        <p className="text-[11px] leading-5 text-[var(--muted)]">
          {ZIELGRUPPE_MEMBERSHIP_NOT_CONSENT_NOTICE}
        </p>
      </div>

      {!live ? (
        <button
          type="button"
          className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
          disabled={disabled || previewLoading}
          aria-busy={previewLoading}
          onClick={() => void runPreview(definition)}
        >
          {previewLoading ? "Wird berechnet…" : "Vorschau aktualisieren"}
        </button>
      ) : (
        <p className="mt-3 text-xs text-[var(--muted)]" aria-live="polite">
          {previewLoading ? "Vorschau wird aktualisiert…" : "Vorschau folgt Ihren Regeln automatisch."}
        </p>
      )}

      {previewError ? (
        <p className="mt-3 text-xs text-red-600" role="alert">
          {previewError}
        </p>
      ) : null}

      {previewStats ? (
        <div className="mt-4 space-y-3" role="status" aria-live="polite">
          <p className="text-lg font-semibold text-[var(--foreground)]">
            Aktuell {previewStats.effective} Person{previewStats.effective === 1 ? "" : "en"}
          </p>
          {previewStats.effective === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Diese Zielgruppe enthält aktuell keine Personen.
            </p>
          ) : null}
          {previewStats.scopeNotice ? (
            <p className="text-xs text-[var(--muted)]">{previewStats.scopeNotice}</p>
          ) : null}
          {previewStats.recipients.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto rounded border border-[var(--border)] bg-[var(--surface-1)] p-2 text-sm">
              {previewStats.recipients.map((r) => (
                <li key={r.personId} className="py-0.5">
                  {r.displayName}
                </li>
              ))}
              {remaining > 0 ? (
                <li className="py-1 text-xs font-medium text-[var(--muted)]">
                  +{remaining} weitere
                </li>
              ) : null}
            </ul>
          ) : previewStats.effective > 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Anzahl sichtbar — Einzelnamen sind in Ihrem Berechtigungsumfang nicht auflistbar.
            </p>
          ) : null}
        </div>
      ) : !previewStats ? (
        <p className="mt-3 text-xs text-[var(--muted)]">
          {live
            ? definitionHasRules
              ? previewLoading
                ? "Vorschau wird aktualisiert…"
                : "Vorschau folgt Ihren Regeln automatisch."
              : "Definieren Sie Regeln, um die Vorschau zu sehen."
            : "Vorschau wird erst nach Klick berechnet."}
        </p>
      ) : null}
    </section>
  );
}
