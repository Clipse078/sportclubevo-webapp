"use client";

import { useState } from "react";
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

function stateLabel(state: BulkEmailReviewRow["state"]): string {
  switch (state) {
    case "EXISTING_PERSON":
      return "Bestehende Person";
    case "EXISTING_EXTERNAL":
      return "Bestehender externer Kontakt";
    case "NEW_EXTERNAL":
      return "Neuer externer Kontakt";
    case "INVALID":
      return "Ungültige Adresse";
    case "POSSIBLE_TYPO":
      return "Möglicher Tippfehler";
    default:
      return state;
  }
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

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="Mehrere E-Mail-Adressen hinzufügen"
      description="Adressen durch Zeilenumbruch, Komma oder Semikolon trennen. Ungültige Adressen werden vor dem Speichern angezeigt."
    >
      <div className="space-y-4">
        <textarea
          className="fca-input min-h-[120px] w-full text-sm"
          placeholder={"anna@example.ch\nparent@example.com"}
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
          <Button
            type="button"
            disabled={disabled || loading || !rows || hasBlocking || rows.length === 0}
            onClick={() => void applyValidRows()}
            data-testid="zielgruppe-bulk-email-apply"
          >
            Übernehmen
          </Button>
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {rows ? (
          <ul
            className="max-h-52 space-y-2 overflow-y-auto text-sm"
            data-testid="zielgruppe-bulk-email-review-list"
          >
            {rows.map((row) => (
              <li
                key={row.raw}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              >
                <div className="font-medium">{row.raw}</div>
                <div className="text-xs text-[var(--muted)]">{stateLabel(row.state)}</div>
                {row.suggestion ? (
                  <div className="text-xs text-amber-700">Vorschlag: {row.suggestion}</div>
                ) : null}
                {row.message ? <div className="text-xs text-red-600">{row.message}</div> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Dialog>
  );
}
