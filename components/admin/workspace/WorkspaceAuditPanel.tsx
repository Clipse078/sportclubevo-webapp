"use client";

import { useCallback, useState } from "react";

import type { WorkspaceAuditListDto } from "@/lib/workspace/audit/workspace-audit-dto";

type Props = {
  initialData: WorkspaceAuditListDto;
};

export function WorkspaceAuditPanel({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (cursor?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/workspace/audit?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Audit konnte nicht geladen werden.");
      }
      const json = (await response.json()) as WorkspaceAuditListDto;
      setData((prev) =>
        cursor
          ? {
              ...json,
              items: [...prev.items, ...json.items],
            }
          : json,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Audit konnte nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Zeit</th>
              <th className="px-3 py-2 font-medium">Aktion</th>
              <th className="px-3 py-2 font-medium">Ergebnis</th>
              <th className="px-3 py-2 font-medium">Akteur</th>
              <th className="px-3 py-2 font-medium">Ressource</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Intl.DateTimeFormat("de-CH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(item.createdAt))}
                </td>
                <td className="px-3 py-2">{item.actionLabel}</td>
                <td className="px-3 py-2">{item.outcome}</td>
                <td className="px-3 py-2">
                  {item.actorDisplayName ?? item.actorUserId ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {item.resourceLabel ?? item.entityId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          disabled={loading || !data.nextCursor}
          onClick={() => void loadPage(data.nextCursor ?? undefined)}
        >
          Ältere Ereignisse
        </button>
        {loading ? <span className="text-xs text-muted-foreground">Lädt…</span> : null}
      </div>
    </div>
  );
}
