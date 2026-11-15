"use client";

type Props = {
  onContinueEditing: () => void;
  onDiscard: () => void;
  testId?: string;
};

/** Inline discard confirmation — no Dialog/portal (SCE contextual create rule). */
export default function SceInlineDiscardConfirm({
  onContinueEditing,
  onDiscard,
  testId = "sce-inline-discard-confirm",
}: Props) {
  return (
    <div
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
      role="alert"
      data-testid={testId}
    >
      <p className="mb-2 font-medium">Ungespeicherte Änderungen verwerfen?</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
          onClick={onDiscard}
          data-testid={`${testId}-discard`}
        >
          Änderungen verwerfen
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]"
          onClick={onContinueEditing}
          data-testid={`${testId}-continue`}
        >
          Weiter bearbeiten
        </button>
      </div>
    </div>
  );
}