"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Plus, User } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  classifyZielgruppeBulkEmailsAction,
  persistZielgruppeBulkExternalContactsAction,
} from "@/app/(admin)/dashboard/communication/zielgruppen/actions";
import type { BulkEmailReviewRow } from "@/lib/communication/external-contacts/bulk-email-classifier";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  onApplied: (result: { externalContactIds: string[]; personIds: string[] }) => void;
};

function stateMeta(state: BulkEmailReviewRow["state"]): {
  label: string;
  tone: "ok" | "warn" | "bad" | "new";
} {
  switch (state) {
    case "EXISTING_PERSON":
      return { label: "Bestehende Person", tone: "ok" };
    case "EXISTING_EXTERNAL":
      return { label: "Bestehender externer Kontakt", tone: "ok" };
    case "NEW_EXTERNAL":
      return { label: "Neuer externer Kontakt", tone: "new" };
    case "INVALID":
      return { label: "Ungültige Adresse", tone: "bad" };
    case "POSSIBLE_TYPO":
      return { label: "Prüfen (möglicher Tippfehler)", tone: "warn" };
    default:
      return { label: state, tone: "warn" };
  }
}

function ReviewIcon({ tone }: { tone: "ok" | "warn" | "bad" | "new" }) {
  if (tone === "ok") return <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
  if (tone === "new") return <Plus className="h-4 w-4 text-[var(--sce-primary)]" aria-hidden="true" />;
  if (tone === "bad") return <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />;
  return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />;
}

export default function ZielgruppeBulkEmailDialog({
  open,
  onOpenChange,
  disabled,
  onApplied,
}: Props) {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<BulkEmailReviewRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (!rows) return null;
    const counts = {
      existingPerson: 0,
      existingExternal: 0,
      newExternal: 0,
      review: 0,
      invalid: 0,
    };
    for (const row of rows) {
      if (row.state === "EXISTING_PERSON") counts.existingPerson += 1;
      else if (row.state === "EXISTING_EXTERNAL") counts.existingExternal += 1;
      else if (row.state === "NEW_EXTERNAL") counts.newExternal += 1;
      else if (row.state === "POSSIBLE_TYPO") counts.review += 1;
      else if (row.state === "INVALID") counts.invalid += 1;
    }
    return { total: rows.length, ...counts };
  }, [rows]);

  async function runReview() {
    setLoading(true);
    setError(null);
    const result = await classifyZielgruppeBulkEmailsAction(raw);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      setRows(null);
      return;
    }
    setRows(result.data);
  }

  async function applyValidRows() {
    if (!rows) return;
    const persistable = rows.filter(
      (row) =>
        row.state === "NEW_EXTERNAL" ||
        row.state === "EXISTING_EXTERNAL" ||
        row.state === "EXISTING_PERSON",
    );
    if (persistable.length === 0) return;
    setLoading(true);
    setError(null);
    const result = await persistZielgruppeBulkExternalContactsAction({
      emails: persistable.map((row) => row.normalized ?? row.raw),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onApplied(result.data);
    setRaw("");
    setRows(null);
    onOpenChange(false);
  }

  const hasBlocking = rows?.some(
    (row) => row.state === "INVALID" || row.state === "POSSIBLE_TYPO",
  );

  const persistableCount =
    rows?.filter(
      (row) =>
        row.state === "NEW_EXTERNAL" ||
        row.state === "EXISTING_EXTERNAL" ||
        row.state === "EXISTING_PERSON",
    ).length ?? 0;

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Mehrere E-Mail-Adressen hinzufügen"
      description="Adressen durch Zeilenumbruch, Komma oder Semikolon trennen. Nach dem Prüfen sehen Sie die Zuordnung pro Adresse."
      size="lg"
    >
      <div className="space-y-5">
        <textarea
          className="fca-input min-h-[160px] w-full text-sm leading-relaxed"
          placeholder={"anna@example.ch, parent@example.com\neltern@verein.ch"}
          value={raw}
          disabled={disabled || loading}
          onChange={(e) => setRaw(e.target.value)}
          aria-label="E-Mail-Adressen"
          data-testid="zielgruppe-bulk-email-input"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || loading || !raw.trim()}
            onClick={() => void runReview()}
            data-testid="zielgruppe-bulk-email-review"
          >
            Prüfen
          </Button>
          {rows ? (
            <Button
              type="button"
              disabled={disabled || loading || hasBlocking || persistableCount === 0}
              onClick={() => void applyValidRows()}
              data-testid="zielgruppe-bulk-email-apply"
            >
              {persistableCount} Empfänger übernehmen
            </Button>
          ) : null}
          <Button type="button" variant="secondary" disabled={loading} onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert" data-testid="zielgruppe-bulk-email-error">
            {error}
          </p>
        ) : null}

        {summary ? (
          <div
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm"
            data-testid="zielgruppe-bulk-email-summary"
          >
            <p className="font-semibold text-[var(--foreground)]">
              {summary.total} Adresse{summary.total === 1 ? "" : "n"} geprüft
            </p>
            <ul className="mt-2 space-y-1 text-[var(--text-2)]">
              {summary.existingPerson > 0 ? (
                <li className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  {summary.existingPerson} bestehende Person
                </li>
              ) : null}
              {summary.existingExternal > 0 ? (
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  {summary.existingExternal} externer Kontakt
                </li>
              ) : null}
              {summary.newExternal > 0 ? (
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[var(--sce-primary)]" aria-hidden="true" />
                  {summary.newExternal} neuer externer Kontakt
                </li>
              ) : null}
              {summary.review + summary.invalid > 0 ? (
                <li className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {summary.review + summary.invalid} prüfen
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {rows ? (
          <ul
            className="max-h-64 space-y-2 overflow-y-auto text-sm"
            data-testid="zielgruppe-bulk-email-review-list"
          >
            {rows.map((row) => {
              const meta = stateMeta(row.state);
              return (
                <li
                  key={row.raw}
                  className="flex gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-3"
                >
                  <ReviewIcon tone={meta.tone} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium break-all">{row.raw}</div>
                    <div className="text-xs text-[var(--muted)]">{meta.label}</div>
                    {row.suggestion ? (
                      <div className="text-xs text-amber-800">Vorschlag: {row.suggestion}</div>
                    ) : null}
                    {row.message ? <div className="text-xs text-red-600">{row.message}</div> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Dialog>
  );
}
