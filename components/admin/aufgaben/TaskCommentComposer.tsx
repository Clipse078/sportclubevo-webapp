"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  disabled?: boolean;
  placeholder?: string;
  initialBody?: string;
  submitLabel?: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
};

export function TaskCommentComposer({
  disabled = false,
  placeholder = "Kommentar schreiben…",
  initialBody = "",
  submitLabel = "Senden",
  onSubmit,
  onCancel,
}: Props) {
  const [body, setBody] = useState(initialBody);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = body.trim();
  const canSubmit = !disabled && !submitting && trimmed.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      if (!onCancel) setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kommentar konnte nicht gespeichert werden.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2" data-testid="task-comment-composer">
      <textarea
        className="fca-input min-h-[4.5rem] w-full resize-y text-sm"
        placeholder={placeholder}
        value={body}
        disabled={disabled || submitting}
        onChange={(e) => setBody(e.target.value)}
        data-testid="task-comment-composer-input"
      />
      {error ? (
        <p className="text-xs text-red-600" data-testid="task-comment-composer-error">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]"
            onClick={onCancel}
            disabled={submitting}
          >
            Abbrechen
          </button>
        ) : null}
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white",
            !canSubmit && "opacity-50",
          )}
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          data-testid="task-comment-composer-submit"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          <Send className="h-3.5 w-3.5" aria-hidden />
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
