"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Props = {
  attentionId: string;
  actionKey: string;
  label: string;
  className?: string;
};

export function PersonalAttentionOperationalActionButton({
  attentionId,
  actionKey,
  label,
  className,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/dashboard/domain-operational-attention/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attentionId, actionKey }),
        });
        const payload = (await response.json()) as {
          error?: string;
          recipientCount?: number;
          resolvedOutstandingCount?: number;
          duplicate?: boolean;
        };
        if (!response.ok) {
          setError(payload.error ?? "Aktion fehlgeschlagen.");
          return;
        }
        if (payload.duplicate) {
          setFeedback("Erinnerung bereits geplant.");
          router.refresh();
          return;
        }
        if ((payload.recipientCount ?? 0) === 0) {
          setFeedback("Keine ausstehenden Rückmeldungen mehr.");
          router.refresh();
          return;
        }
        setFeedback(
          payload.recipientCount === 1
            ? "Erinnerung an 1 Person gesendet."
            : `Erinnerung an ${payload.recipientCount} Personen gesendet.`,
        );
        router.refresh();
      } catch {
        setError("Netzwerkfehler — bitte erneut versuchen.");
      }
    });
  }

  return (
    <div className={cn("flex shrink-0 flex-col items-end gap-1", className)}>
      <button
        type="button"
        className="fca-button-secondary text-[0.6875rem] px-2.5 py-1 disabled:opacity-60"
        disabled={pending}
        onClick={onClick}
      >
        {pending ? "…" : label}
      </button>
      {feedback ? (
        <p className="max-w-[9rem] text-right text-[0.625rem] text-[var(--sce-success)]">{feedback}</p>
      ) : null}
      {error ? (
        <p className="max-w-[9rem] text-right text-[0.625rem] text-[var(--sce-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
