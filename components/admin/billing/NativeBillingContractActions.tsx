"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  contractKey: string;
  status: string;
  canManage: boolean;
};

export default function NativeBillingContractActions({
  contractKey,
  status,
  canManage,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patchStatus(next: "ACTIVE" | "PAUSED" | "TERMINATED") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/billing/contracts/${contractKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Aktion fehlgeschlagen.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  if (!canManage) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <button
          type="button"
          className="fca-button-primary"
          disabled={loading}
          onClick={() => patchStatus("ACTIVE")}
        >
          Aktivieren
        </button>
      )}
      {status === "ACTIVE" && (
        <>
          <button
            type="button"
            className="fca-button-secondary"
            disabled={loading}
            onClick={() => patchStatus("PAUSED")}
          >
            Pausieren
          </button>
          <button
            type="button"
            className="fca-button-secondary"
            disabled={loading}
            onClick={() => patchStatus("TERMINATED")}
          >
            Beenden
          </button>
        </>
      )}
      {status === "PAUSED" && (
        <button
          type="button"
          className="fca-button-primary"
          disabled={loading}
          onClick={() => patchStatus("ACTIVE")}
        >
          Reaktivieren
        </button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
