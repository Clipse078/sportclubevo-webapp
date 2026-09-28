"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy } from "lucide-react";

type Props = {
  targetGroupId: string;
  sourceName: string;
  canManage: boolean;
  variant?: "button" | "link";
};

export default function ZielgruppeDuplicateButton({
  targetGroupId,
  sourceName,
  canManage,
  variant = "button",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canManage) return null;

  async function handleDuplicate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/target-groups/${targetGroupId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Duplizieren fehlgeschlagen.");
        return;
      }
      if (data?.targetGroup?.id) {
        router.push(`/dashboard/communication/zielgruppen/${data.targetGroup.id}?edit=1`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  const label = loading ? "Wird kopiert…" : "Duplizieren";

  if (variant === "link") {
    return (
      <span className="inline-flex flex-col">
        <button
          type="button"
          disabled={loading}
          className="text-xs font-medium text-[var(--sce-primary)] hover:underline disabled:opacity-50"
          onClick={() => void handleDuplicate()}
          aria-label={`Kopie von ${sourceName} erstellen`}
        >
          {label}
        </button>
        {error ? (
          <span className="text-[10px] text-red-600" role="alert">
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={loading}
        className="fca-button-secondary inline-flex items-center gap-2 text-sm"
        onClick={() => void handleDuplicate()}
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
