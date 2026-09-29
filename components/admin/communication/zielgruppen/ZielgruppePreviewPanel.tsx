"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { previewZielgruppeRecipientsAction } from "@/app/(admin)/dashboard/communication/zielgruppen/actions";
import {
  ZIELGRUPPE_MEMBERSHIP_NOT_CONSENT_NOTICE,
  ZIELGRUPPE_PREVIEW_DELIVERY_NOTICE,
} from "@/lib/communication/zielgruppen/zielgruppen-display";
import { zielgruppeDefinitionIsEmpty } from "@/lib/communication/zielgruppen/editor-model";

type Props = {
  definition: ZielgruppeEditorDefinition;
  disabled?: boolean;
  live?: boolean;
  onStatsChange?: (stats: PreviewStats | null) => void;
};

export type PreviewStats = {
  totalRecipients: number;
  personCount: number;
  externalCount: number;
  excluded: number;
};

const PREVIEW_DEBOUNCE_MS = 450;

function recipientInitials(name: string, email?: string | null): string {
  const source = name.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function ZielgruppePreviewPanel({
  definition,
  disabled,
  live = false,
  onStatsChange,
}: Props) {
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showRestrictedInfo, setShowRestrictedInfo] = useState(false);
  const [previewStats, setPreviewStats] = useState<{
    candidates: number;
    excluded: number;
    effective: number;
    externalCount: number;
    scopeNotice: string | null;
    recipients: Array<{
      kind: "PERSON" | "EXTERNAL";
      personId?: string;
      externalContactId?: string;
      displayName: string;
      email?: string | null;
      includedPaths: Array<{ code: string; label: string }>;
    }>;
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
      onStatsChange?.(null);
      return;
    }
    setPreviewStats({
      candidates: result.data.candidates,
      excluded: result.data.excluded,
      effective: result.data.effective,
      externalCount: result.data.externalCount,
      scopeNotice: result.data.scopeNotice,
      recipients: result.data.recipients,
      hasMore: result.data.hasMore,
    });
    const personCount = Math.max(0, result.data.effective);
    onStatsChange?.({
      totalRecipients: result.data.effective + result.data.externalCount,
      personCount,
      externalCount: result.data.externalCount,
      excluded: result.data.excluded,
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

  const totalRecipients = previewStats
    ? previewStats.effective + previewStats.externalCount
    : 0;
  const personCount = previewStats?.effective ?? 0;
  const externalCount = previewStats?.externalCount ?? 0;

  const filteredRecipients = useMemo(() => {
    if (!previewStats) return [];
    const term = filter.trim().toLowerCase();
    if (!term) return previewStats.recipients;
    return previewStats.recipients.filter((r) => {
      const hay = `${r.displayName} ${r.email ?? ""} ${r.includedPaths.map((p) => p.label).join(" ")}`.toLowerCase();
      return hay.includes(term);
    });
  }, [filter, previewStats]);

  const remaining =
    previewStats && previewStats.hasMore
      ? Math.max(0, totalRecipients - previewStats.recipients.length)
      : 0;

  const showPreviewData = definitionHasRules && previewStats;

  let state: "loading" | "empty-def" | "empty-result" | "filtered-empty" | "error" | "success" =
    "empty-def";
  if (previewError) state = "error";
  else if (previewLoading && !previewStats) state = "loading";
  else if (!definitionHasRules) state = "empty-def";
  else if (showPreviewData && totalRecipients === 0) state = "empty-result";
  else if (showPreviewData && filteredRecipients.length === 0 && filter.trim())
    state = "filtered-empty";
  else if (showPreviewData) state = "success";

  return (
    <section
      className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)]"
      aria-label="Live-Vorschau"
      data-testid="zielgruppe-live-preview"
    >
      <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-[var(--foreground)]">Live-Vorschau</h3>
          <button
            type="button"
            className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue)]"
            aria-label="Hinweise zur Vorschau"
            aria-expanded={showRestrictedInfo}
            onClick={() => setShowRestrictedInfo((v) => !v)}
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {showRestrictedInfo ? (
          <div className="mt-2 space-y-1 rounded-lg bg-[var(--surface-2)] p-3 text-xs text-[var(--text-2)]">
            <p>{ZIELGRUPPE_PREVIEW_DELIVERY_NOTICE}</p>
            <p>{ZIELGRUPPE_MEMBERSHIP_NOT_CONSENT_NOTICE}</p>
          </div>
        ) : null}

        {state === "loading" ? (
          <div className="mt-4 space-y-2" aria-busy="true">
            <div className="h-8 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="h-4 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
        ) : (
          <div className="mt-3" role="status" aria-live="polite">
            <p className="text-3xl font-bold tabular-nums text-[var(--foreground)]">
              {showPreviewData ? totalRecipients : "—"}
            </p>
            <p className="text-sm font-medium text-[var(--foreground)]">Empfänger</p>
            {showPreviewData && totalRecipients > 0 ? (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {personCount} Personen
                {externalCount > 0 ? ` · ${externalCount} Externe` : ""}
                {previewStats.excluded > 0 ? ` · ${previewStats.excluded} ausgeschlossen` : ""}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-5">
        {!live ? (
          <button
            type="button"
            className="mb-3 min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--blue)]"
            disabled={disabled || previewLoading}
            onClick={() => void runPreview(definition)}
          >
            {previewLoading ? "Wird berechnet…" : "Vorschau aktualisieren"}
          </button>
        ) : null}

        {previewError ? (
          <p className="text-sm text-red-600" role="alert" data-testid="zielgruppe-preview-error">
            {previewError}
          </p>
        ) : null}

        {state === "empty-def" ? (
          <p className="text-sm text-[var(--muted)]">
            Füge eine Auswahl hinzu, um die Zielgruppe zu sehen.
          </p>
        ) : null}

        {state === "empty-result" ? (
          <p className="text-sm text-[var(--muted)]">
            Diese Regeln ergeben aktuell keine Empfänger.
          </p>
        ) : null}

        {state === "success" || state === "filtered-empty" ? (
          <>
            <label className="sr-only" htmlFor="zg-preview-search">
              Empfänger in Vorschau suchen
            </label>
            <input
              id="zg-preview-search"
              type="search"
              className="fca-input mb-3 w-full text-sm"
              placeholder="Empfänger suchen…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={previewLoading}
            />
          </>
        ) : null}

        {state === "filtered-empty" ? (
          <p className="text-sm text-[var(--muted)]">Keine Empfänger passen zur Suche.</p>
        ) : null}

        {state === "success" ? (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredRecipients.map((r) => {
              const key = r.personId ?? r.externalContactId ?? r.displayName;
              const paths = r.includedPaths ?? [];
              const primaryPath = paths[0]?.label;
              const extraPaths = paths.length > 1 ? paths.length - 1 : 0;
              return (
                <li
                  key={key}
                  className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 p-3"
                  data-testid="zielgruppe-preview-recipient"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--sce-primary)]/15 text-xs font-bold text-[var(--sce-primary)]"
                    aria-hidden="true"
                  >
                    {recipientInitials(r.displayName, r.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--foreground)]">{r.displayName}</div>
                    {r.email ? (
                      <div className="truncate text-xs text-[var(--muted)]">{r.email}</div>
                    ) : null}
                    {primaryPath ? (
                      <div className="mt-1 text-xs text-[var(--text-2)]">
                        {primaryPath}
                        {extraPaths > 0 ? (
                          <span className="text-[var(--muted)]"> · +{extraPaths} weiterer Grund</span>
                        ) : null}
                      </div>
                    ) : null}
                    {paths.length > 0 ? (
                      <details className="mt-1 text-xs text-[var(--muted)]">
                        <summary className="cursor-pointer font-medium text-[var(--sce-primary)]">
                          Enthalten über
                        </summary>
                        <ul className="mt-1 list-inside list-disc">
                          {paths.map((path) => (
                            <li key={path.code}>{path.label}</li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {remaining > 0 ? (
              <li className="py-2 text-center text-xs font-medium text-[var(--muted)]">
                +{remaining} weitere
              </li>
            ) : null}
            {previewStats?.scopeNotice ? (
              <li className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                {previewStats.scopeNotice}
              </li>
            ) : null}
            {previewStats && previewStats.effective > 0 && previewStats.recipients.length === 0 ? (
              <li className="text-xs text-[var(--muted)]">
                Anzahl sichtbar — Einzelnamen sind in Ihrem Berechtigungsumfang nicht auflistbar.
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
