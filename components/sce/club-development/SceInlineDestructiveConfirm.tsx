"use client";

type Props = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  testId?: string;
};

/**
 * Inline destructive confirmation — no Dialog/browser confirm (SCE contextual rule).
 */
export default function SceInlineDestructiveConfirm({
  title,
  description,
  confirmLabel = "Endgültig löschen",
  cancelLabel = "Abbrechen",
  pending = false,
  error,
  onConfirm,
  onCancel,
  testId = "sce-inline-destructive-confirm",
}: Props) {
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-950"
      role="alert"
      data-testid={testId}
    >
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-red-900/90">{description}</p> : null}
      {error ? <p className="mt-2 text-xs font-medium text-red-800">{error}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          onClick={onConfirm}
          disabled={pending}
          data-testid={`${testId}-confirm`}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] disabled:opacity-50"
          onClick={onCancel}
          disabled={pending}
          data-testid={`${testId}-cancel`}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}