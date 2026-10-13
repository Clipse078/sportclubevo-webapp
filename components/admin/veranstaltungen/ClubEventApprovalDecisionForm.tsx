"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  revisionId: string;
};

export default function ClubEventApprovalDecisionForm({ revisionId }: Props) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function decide(decision: "APPROVE" | "REQUEST_CHANGES" | "REJECT") {
    setLoading(decision);
    setError(null);
    try {
      const res = await fetch("/api/club-events/governance/decisions", {
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
      setLoading(null);
    }
  }

  return (
    <div className="mt-3 space-y-2" data-testid="club-event-approval-decision-form">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--text-2)]">Kommentar</span>
        <textarea
          className="fca-textarea min-h-[72px] w-full text-sm"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Pflicht bei Änderungen / Ablehnung"
        />
      </label>
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={loading != null}
          onClick={() => void decide("APPROVE")}
        >
          Freigeben
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading != null}
          onClick={() => void decide("REQUEST_CHANGES")}
        >
          Änderungen anfordern
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading != null}
          onClick={() => void decide("REJECT")}
        >
          Ablehnen
        </Button>
      </div>
    </div>
  );
}
