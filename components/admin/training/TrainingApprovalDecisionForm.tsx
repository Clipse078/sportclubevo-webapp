"use client";

import { useState } from "react";

type Props = {
  revisionId: string;
};

export default function TrainingApprovalDecisionForm({ revisionId }: Props) {
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: "APPROVE" | "REQUEST_CHANGES" | "REJECT") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/training/governance/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, decision, comment }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Entscheidung fehlgeschlagen.");
        return;
      }
      window.location.reload();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 space-y-2" data-testid={`training-approval-decision-${revisionId}`}>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--text-2)]">Kommentar</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="fca-input min-h-[3rem] w-full text-sm"
          rows={2}
        />
      </label>
      {error ? <p className="text-xs text-[var(--sce-danger)]">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="fca-button-primary text-xs"
          disabled={pending}
          onClick={() => submit("APPROVE")}
        >
          Freigeben
        </button>
        <button
          type="button"
          className="fca-button-secondary text-xs"
          disabled={pending}
          onClick={() => submit("REQUEST_CHANGES")}
        >
          Änderungen anfordern
        </button>
        <button
          type="button"
          className="fca-button-secondary text-xs"
          disabled={pending}
          onClick={() => submit("REJECT")}
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
