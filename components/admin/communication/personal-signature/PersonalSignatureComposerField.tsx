"use client";

import { previewMessageWithPersonalSignature } from "@/lib/communication/personal-signature/personal-signature-compose";
import { MAX_PERSONAL_SIGNATURE_LENGTH } from "@/lib/communication/personal-signature/personal-signature-constants";

type Props = {
  checkboxId: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  signatureBody: string | null;
  messageBody: string;
  disabled?: boolean;
  showPreview?: boolean;
  previewHeadingId?: string;
};

export function PersonalSignatureComposerField({
  checkboxId,
  enabled,
  onEnabledChange,
  signatureBody,
  messageBody,
  disabled = false,
  showPreview = false,
  previewHeadingId = "personal-signature-preview-heading",
}: Props) {
  const hasSignature = Boolean(signatureBody?.trim());
  const preview = previewMessageWithPersonalSignature(
    messageBody,
    enabled && hasSignature ? signatureBody : null,
  );

  if (!hasSignature) {
    return (
      <p className="text-xs text-[var(--text-2)]">
        Keine persönliche Signatur hinterlegt.{" "}
        <a
          href="/dashboard/communication/personal-signature"
          className="font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline"
        >
          Signatur verwalten
        </a>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          id={checkboxId}
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        />
        <span>Meine Signatur verwenden</span>
      </label>
      {showPreview && enabled ? (
        <section aria-labelledby={previewHeadingId} className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)]/60 p-3 text-sm">
          <h3 id={previewHeadingId} className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)]">
            Vorschau mit Signatur
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-[var(--foreground)]">{preview.message || "—"}</p>
          {preview.signature ? (
            <>
              <p className="mt-3 text-xs text-[var(--text-2)]" aria-hidden>
                —
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[var(--foreground)]">{preview.signature}</p>
            </>
          ) : null}
        </section>
      ) : null}
      <p className="text-[11px] text-[var(--text-2)]">
        Signatur max. {MAX_PERSONAL_SIGNATURE_LENGTH} Zeichen · wird beim Senden in den Nachrichtentext übernommen.
      </p>
    </div>
  );
}
