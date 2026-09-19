"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  unresolvedMessageId: string;
};

export default function BillingInboundUnresolvedResolveForm({
  unresolvedMessageId,
}: Props) {
  const router = useRouter();
  const [invoiceKey, setInvoiceKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = invoiceKey.trim();
    if (!trimmed) {
      setError("Rechnungsschlüssel ist erforderlich.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(
        `/api/platform/billing/inbound-unresolved/${encodeURIComponent(unresolvedMessageId)}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceKey: trimmed }),
        },
      );
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? "Zuordnung fehlgeschlagen.");
        return;
      }
      setInvoiceKey("");
      router.refresh();
    } catch {
      setError("Zuordnung fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
        <span className="text-[var(--muted)]">Rechnung zuordnen</span>
        <input
          type="text"
          value={invoiceKey}
          onChange={(event) => setInvoiceKey(event.target.value)}
          placeholder="Rechnungsschlüssel"
          className="rounded-md border border-[color-mix(in_srgb,var(--border)_55%,transparent)] bg-transparent px-2 py-1 text-sm"
          disabled={pending}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Zuordnen…" : "Zuordnen"}
      </button>
      {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
