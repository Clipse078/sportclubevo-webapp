"use client";

import { useCallback, useMemo, useState } from "react";
import { MAX_PERSONAL_SIGNATURE_LENGTH } from "@/lib/communication/personal-signature/personal-signature-constants";
import { previewMessageWithPersonalSignature } from "@/lib/communication/personal-signature/personal-signature-compose";

type Preference = {
  bodyText: string | null;
  useByDefault: boolean;
  hasStoredPreference: boolean;
};

type Props = {
  initialPreference: Preference;
};

export default function PersonalSignatureWorkspace({ initialPreference }: Props) {
  const [bodyText, setBodyText] = useState(initialPreference.bodyText ?? "");
  const [useByDefault, setUseByDefault] = useState(initialPreference.useByDefault);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () =>
      previewMessageWithPersonalSignature(
        "Ihre Nachricht erscheint hier.",
        bodyText.trim() || null,
      ),
    [bodyText],
  );

  const save = useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/communication/personal-signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyText, useByDefault }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setStatus("Signatur gespeichert.");
    } catch {
      setError("Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }, [bodyText, useByDefault]);

  const remove = useCallback(async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/communication/personal-signature", { method: "DELETE" });
      if (!res.ok) {
        setError("Signatur konnte nicht entfernt werden.");
        return;
      }
      setBodyText("");
      setUseByDefault(true);
      setStatus("Signatur entfernt.");
    } catch {
      setError("Signatur konnte nicht entfernt werden.");
    } finally {
      setBusy(false);
    }
  }, []);

  const length = bodyText.length;
  const lengthInvalid = length > MAX_PERSONAL_SIGNATURE_LENGTH;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-[var(--text-2)]">
        Lege fest, welche Signatur bei deinen Kommunikationsnachrichten verwendet werden soll.
        Die Signatur gehört dir persönlich und ändert nicht den Vereins-E-Mail-Absender.
      </p>

      <div className="space-y-2">
        <label htmlFor="personal-signature-body" className="block text-sm font-medium">
          Signatur
        </label>
        <textarea
          id="personal-signature-body"
          rows={8}
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
          aria-describedby="personal-signature-length personal-signature-preview-heading"
          aria-invalid={lengthInvalid}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          placeholder={"Freundliche Grüsse\nMax Mustermann\nTrainer F2\nFC Allschwil"}
        />
        <p
          id="personal-signature-length"
          className={`text-xs ${lengthInvalid ? "text-red-600" : "text-[var(--text-2)]"}`}
        >
          {length} / {MAX_PERSONAL_SIGNATURE_LENGTH} Zeichen
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={useByDefault}
          onChange={(event) => setUseByDefault(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        />
        <span>Signatur standardmässig verwenden</span>
      </label>

      <section
        aria-labelledby="personal-signature-preview-heading"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4"
      >
        <h2 id="personal-signature-preview-heading" className="text-sm font-semibold">
          Vorschau
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--foreground)]">{preview.message}</p>
        {preview.signature ? (
          <>
            <p className="mt-3 text-xs text-[var(--text-2)]" aria-hidden>
              —
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--foreground)]">{preview.signature}</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-2)]">Noch keine Signatur hinterlegt.</p>
        )}
      </section>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="text-sm text-green-700" role="status">
          {status}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={busy || lengthInvalid}
          onClick={() => void save()}
          className="rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Speichern …" : "Speichern"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
        >
          Signatur entfernen
        </button>
      </div>
    </div>
  );
}
